import type { Ctx } from "@/server/db/env";
import {
  resolverVentana,
  type ContextoVentana,
  type ReglaVentana,
  type VentanaEfectiva,
} from "@/domain";
import { ApiError } from "@/server/api/api-error";
import { tieneRol } from "@/server/auth/guards";
import type { IndicadorCompleto } from "@/server/repositories/indicador.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { conTTL, TTL_CORTO } from "./cache";

/**
 * Ventanas de carga (plazos, prórrogas, cierres) — capa de aplicación.
 * La regla de resolución vive en el dominio puro (`src/domain/plazos.ts`);
 * acá solo se leen las filas de `VentanaCarga` y se aplica el bloqueo.
 *
 * INVARIANTE: el cierre bloquea SOLO a las dependencias de carga; DGPD y
 * ADMIN siempre pueden operar (son quienes prorrogan, abren y cierran).
 */

/** Reglas del período, cacheadas (se limpian con `invalidarEstadoPEI()`). */
export function reglasDelPeriodo(
  ctx: Ctx,
  periodoId: number,
): Promise<ReglaVentana[]> {
  return conTTL("ventanas", `${ctx.env}:${periodoId}`, TTL_CORTO, true, async () => {
    const filas = await ctx.db.ventanaCarga.findMany({
      where: { periodoId },
      orderBy: { creadoEn: "asc" },
    });
    return filas.map((f) => ({
      scope: f.scope,
      entidad: f.entidad,
      tipo: f.tipo,
      fechaLimite: f.fechaLimite,
      motivo: f.motivo,
      creadoEn: f.creadoEn,
    }));
  });
}

/** Contexto de ventana a partir del indicador del catálogo. */
export function contextoDe(ind: IndicadorCompleto): ContextoVentana {
  return {
    indicadorCodigo: ind.codigo,
    aeCodigo: ind.ae?.codigo ?? null,
    oeCodigo: ind.oe.codigo,
    dependenciaIds: ind.responsables.map((r) => r.dependenciaId),
  };
}

/** Ventana vigente de un indicador en un ejercicio. */
export async function ventanaDeIndicador(
  ctx: Ctx,
  ind: IndicadorCompleto,
  anio: number,
  ahora = new Date(),
): Promise<VentanaEfectiva> {
  const periodo = await periodoAnual(ctx, anio);
  const reglas = await reglasDelPeriodo(ctx, periodo.id);
  return resolverVentana(reglas, contextoDe(ind), {
    fechaLimitePeriodo: periodo.fechaLimiteCarga,
    ahora,
  });
}

/** Resolutor reutilizable para listas (evita releer reglas por indicador). */
export async function resolutorVentanas(
  ctx: Ctx,
  anio: number,
  ahora = new Date(),
): Promise<(ind: IndicadorCompleto) => VentanaEfectiva> {
  const periodo = await periodoAnual(ctx, anio);
  const reglas = await reglasDelPeriodo(ctx, periodo.id);
  return (ind) =>
    resolverVentana(reglas, contextoDe(ind), {
      fechaLimitePeriodo: periodo.fechaLimiteCarga,
      ahora,
    });
}

/** ¿El actor está sujeto al cierre de carga? (solo dependencias de carga). */
export function sujetoAlCierre(ctx: Ctx): boolean {
  return (
    tieneRol(ctx.actor, "DEPENDENCIA_CARGA") &&
    !tieneRol(ctx.actor, "ADMIN", "DGPD_VALIDADOR")
  );
}

function fmtFecha(d: Date | null): string {
  return d
    ? d.toLocaleDateString("es-PY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Asuncion",
      })
    : "—";
}

/**
 * Lanza 409 si la ventana está cerrada y el actor es una dependencia de carga.
 * Se invoca en guardarBorrador / enviar / evidencias.
 */
export async function exigirCargaHabilitada(
  ctx: Ctx,
  ind: IndicadorCompleto,
  anio: number,
): Promise<void> {
  if (!sujetoAlCierre(ctx)) return;
  const v = await ventanaDeIndicador(ctx, ind, anio);
  if (v.estado === "ABIERTA") return;
  throw new ApiError(
    409,
    "CARGA_CERRADA",
    v.cierreManual
      ? `La carga de este indicador está cerrada por la DGPD${v.motivo ? `: ${v.motivo}` : "."} Solicite su habilitación o una prórroga.`
      : `El plazo de carga venció el ${fmtFecha(v.fechaLimite)}. Solicite una prórroga a la DGPD para volver a cargar.`,
  );
}
