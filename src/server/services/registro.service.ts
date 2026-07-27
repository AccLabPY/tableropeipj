import type { Ctx } from "@/server/db/env";
import { resolverUmbral } from "@/domain";
import { ROLES_VISION_TOTAL, tieneRol } from "@/server/auth/guards";
import { cargablesPorActor } from "@/server/repositories/indicador.repo";
import {
  ultimaVersion,
  visiblesDelPeriodo,
} from "@/server/repositories/medicion.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { catalogoIndicadores, umbralesCached } from "./estado-pei.service";
import { conTTL, TTL_CORTO } from "./cache";
import { num } from "./mappers";
import { toMedicionResumen } from "./medicion-dto";
import type { RegistroDTO, RegistroItemDTO } from "@/shared/dtos/registro";

/** Worklist del Registro: indicadores cargables por el actor + su medición. */
export async function worklistRegistro(
  ctx: Ctx,
  anio: number,
): Promise<RegistroDTO> {
  const visionTotal = tieneRol(ctx.actor, ...ROLES_VISION_TOTAL);
  const [indicadores, umbrales, periodo] = await Promise.all([
    // Para visión total la worklist es el catálogo completo (ya cacheado);
    // los actores con scoping consultan su subconjunto sin caché.
    visionTotal ? catalogoIndicadores(ctx) : cargablesPorActor(ctx),
    umbralesCached(ctx),
    periodoAnual(ctx, anio),
  ]);
  const mediciones = visionTotal
    ? await conTTL("registro-meds", `${ctx.env}:${anio}`, TTL_CORTO, true, () =>
        visiblesDelPeriodo(ctx, periodo.id),
      )
    : await visiblesDelPeriodo(ctx, periodo.id);
  const porIndicador = new Map<number, typeof mediciones>();
  for (const m of mediciones) {
    const arr = porIndicador.get(m.indicadorId) ?? [];
    arr.push(m);
    porIndicador.set(m.indicadorId, arr);
  }

  const items: RegistroItemDTO[] = indicadores.map((ind) => {
    const metaAnio = ind.metas.find((m) => m.anio === anio);
    const ultima = ultimaVersion(porIndicador.get(ind.id) ?? []);
    const umbral = resolverUmbral(umbrales, {
      indicadorCodigo: ind.codigo,
      aeCodigo: ind.ae?.codigo ?? null,
      oeCodigo: ind.oe.codigo,
    });
    return {
      codigo: ind.codigo,
      nombre: ind.nombre,
      descripcion: ind.descripcion,
      formula: ind.formula,
      oeCodigo: ind.oe.codigo,
      aeCodigo: ind.ae?.codigo ?? null,
      unidad: ind.unidad,
      sentido: ind.sentido,
      esEscala: ind.esEscala,
      basePendiente: ind.basePendiente,
      lineaBase: num(ind.lineaBase),
      meta: num(metaAnio?.valorMeta as never),
      metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
      dependenciaPrincipal:
        ind.responsables.find((r) => r.rol === "PRINCIPAL")?.dependencia
          .nombre ?? "—",
      escala: ind.escala.map((e) => ({
        nivel: e.nivel,
        descripcion: e.descripcion,
        pctMin: num(e.pctMin)!,
        pctMax: num(e.pctMax)!,
      })),
      umbralVerde: umbral.verde,
      umbralAmarillo: umbral.amarillo,
      medicion: ultima ? toMedicionResumen(ultima) : null,
    };
  });

  return {
    anio,
    items,
    puedeValidar: tieneRol(ctx.actor, "DGPD_VALIDADOR", "ADMIN"),
    puedeCargar: tieneRol(ctx.actor, "DEPENDENCIA_CARGA", "ADMIN"),
  };
}
