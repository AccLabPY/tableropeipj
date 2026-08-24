import type { Ctx } from "@/server/db/env";
import { prismaControl } from "@/server/db/client";
import { clasificarFormula, parsearVariables } from "@/domain";
import type { EstadoWF } from "@/domain/types";
import { noEncontrado } from "@/server/api/api-error";
import { porId } from "@/server/repositories/medicion.repo";
import { catalogoIndicadores } from "./estado-pei.service";
import { toMedicionResumen } from "./medicion-dto";
import { conTTL, TTL_LARGO } from "./cache";
import { iso } from "./mappers";
import type { DetalleCargaDTO } from "@/shared/dtos/detalle-carga";

/** Nombres de usuario por id (padrón de control), en lote y cacheado. */
async function nombresDeUsuarios(
  ids: number[],
): Promise<Map<number, string>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const todos = await conTTL("notif-dest", "padron-nombres", TTL_LARGO, true, async () => {
    const filas = await prismaControl().usuario.findMany({
      select: { id: true, nombre: true },
    });
    return filas.map((f) => [f.id, f.nombre] as const);
  });
  const mapa = new Map(todos);
  return new Map(unicos.map((id) => [id, mapa.get(id) ?? `Usuario #${id}`]));
}

/**
 * Detalle completo de una carga individual: medición + evidencias +
 * resoluciones de la DGPD + timeline del historial con actores resueltos.
 * El scoping viene de `porId` (una dependencia solo ve sus propias cargas).
 */
export async function detalleCarga(
  ctx: Ctx,
  id: bigint,
): Promise<DetalleCargaDTO> {
  const m = await porId(ctx, id);
  if (!m) throw noEncontrado("Carga");

  const inds = await catalogoIndicadores(ctx);
  const ind = inds.find((i) => i.id === m.indicadorId);
  if (!ind) throw noEncontrado("Indicador de la carga");
  const tipoCalculo = clasificarFormula(ind.formula, ind.esEscala);

  const posteriores = await ctx.db.medicion.count({
    where: {
      indicadorId: m.indicadorId,
      periodoId: m.periodoId,
      version: { gt: m.version },
    },
  });

  const nombres = await nombresDeUsuarios([
    ...m.historial.map((h) => h.usuarioId).filter((x): x is number => x !== null),
    ...m.validaciones.map((v) => v.usuarioId).filter((x): x is number => x !== null),
    ...(m.usuarioCargaId !== null ? [m.usuarioCargaId] : []),
  ]);

  return {
    medicion: toMedicionResumen(m),
    indicador: {
      codigo: ind.codigo,
      nombre: ind.nombre,
      oeCodigo: ind.oe.codigo,
      aeCodigo: ind.ae?.codigo ?? null,
      unidad: ind.unidad,
      variablesDef: parsearVariables(ind.variables, tipoCalculo),
    },
    cargadorNombre:
      m.usuarioCargaId !== null ? (nombres.get(m.usuarioCargaId) ?? null) : null,
    esUltimaVersion: posteriores === 0,
    historial: m.historial.map((h) => ({
      estadoAnterior: h.estadoAnterior as EstadoWF | null,
      estadoNuevo: h.estadoNuevo as EstadoWF,
      actorNombre: h.usuarioId !== null ? (nombres.get(h.usuarioId) ?? null) : null,
      comentario: h.comentario,
      fecha: iso(h.fecha)!,
    })),
    resoluciones: m.validaciones.map((v) => ({
      resultado: v.resultado,
      actorNombre: v.usuarioId !== null ? (nombres.get(v.usuarioId) ?? null) : null,
      comentario: v.comentario,
      fecha: iso(v.fecha)!,
    })),
  };
}
