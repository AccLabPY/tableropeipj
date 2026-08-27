import type { Ctx } from "@/server/db/env";
import { prismaControl } from "@/server/db/client";
import { tieneRol } from "@/server/auth/guards";
import { clasificarFormula, parsearVariables } from "@/domain";
import type { EstadoWF } from "@/domain/types";
import { noEncontrado } from "@/server/api/api-error";
import { porId } from "@/server/repositories/medicion.repo";
import { catalogoIndicadores } from "./estado-pei.service";
import { toMedicionResumen } from "./medicion-dto";
import { conTTL, TTL_LARGO } from "./cache";
import { ventanaDeIndicador } from "./plazos.service";
import { iso } from "./mappers";
import type { DetalleCargaDTO } from "@/shared/dtos/detalle-carga";

/** Ids de los usuarios con rol de validación (para anonimizar ante la carga). */
function idsValidadores(): Promise<Set<number>> {
  return conTTL("notif-dest", "ids-validadores", TTL_LARGO, true, async () => {
    const filas = await prismaControl().usuario.findMany({
      where: { roles: { some: { rol: { in: ["DGPD_VALIDADOR", "ADMIN"] } } } },
      select: { id: true },
    });
    return new Set(filas.map((f) => f.id));
  });
}

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

  const ventana = await ventanaDeIndicador(ctx, ind, m.periodo.anio);
  const posteriores = await ctx.db.medicion.count({
    where: {
      indicadorId: m.indicadorId,
      periodoId: m.periodoId,
      version: { gt: m.version },
    },
  });

  const [nombres, validadores] = await Promise.all([
    nombresDeUsuarios([
      ...m.historial.map((h) => h.usuarioId).filter((x): x is number => x !== null),
      ...m.validaciones.map((v) => v.usuarioId).filter((x): x is number => x !== null),
      ...(m.usuarioCargaId !== null ? [m.usuarioCargaId] : []),
    ]),
    idsValidadores(),
  ]);

  /**
   * Ante las dependencias de carga, la actuación de la DGPD se muestra
   * institucional ("la DGPD") en lugar del nombre del validador; los roles de
   * validación y administración sí ven quién actuó (auditoría interna).
   */
  const soloCarga =
    tieneRol(ctx.actor, "DEPENDENCIA_CARGA") &&
    !tieneRol(ctx.actor, "ADMIN", "DGPD_VALIDADOR");
  const actorDe = (usuarioId: number | null): string | null => {
    if (usuarioId === null) return null;
    if (soloCarga && validadores.has(usuarioId)) return "la DGPD";
    return nombres.get(usuarioId) ?? null;
  };

  return {
    medicion: toMedicionResumen(m),
    indicador: {
      codigo: ind.codigo,
      nombre: ind.nombre,
      oeCodigo: ind.oe.codigo,
      aeCodigo: ind.ae?.codigo ?? null,
      unidad: ind.unidad,
      variablesDef: parsearVariables(ind.variables, tipoCalculo),
      dependenciaId:
        ind.responsables.find((r) => r.rol === "PRINCIPAL")?.dependenciaId ??
        ind.responsables[0]?.dependenciaId ??
        null,
    },
    ventana: {
      estado: ventana.estado,
      fechaLimite: ventana.fechaLimite ? ventana.fechaLimite.toISOString() : null,
      diasRestantes: ventana.diasRestantes,
      conProrroga: ventana.conProrroga,
      cierreManual: ventana.cierreManual,
      motivo: ventana.motivo,
    },
    cargadorNombre:
      m.usuarioCargaId !== null ? (nombres.get(m.usuarioCargaId) ?? null) : null,
    esUltimaVersion: posteriores === 0,
    historial: m.historial.map((h) => ({
      estadoAnterior: h.estadoAnterior as EstadoWF | null,
      estadoNuevo: h.estadoNuevo as EstadoWF,
      actorNombre: actorDe(h.usuarioId),
      comentario: h.comentario,
      fecha: iso(h.fecha)!,
    })),
    resoluciones: m.validaciones.map((v) => ({
      resultado: v.resultado,
      actorNombre: actorDe(v.usuarioId),
      comentario: v.comentario,
      fecha: iso(v.fecha)!,
    })),
  };
}
