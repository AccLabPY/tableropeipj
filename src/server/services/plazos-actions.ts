"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import type { ScopeVentana } from "@prisma/client";
import { requireApi, tieneRol } from "@/server/auth/guards";
import { getCtx, type Ctx } from "@/server/db/env";
import { ApiError, sinPermiso } from "@/server/api/api-error";
import { periodoAnual, invalidarPeriodos } from "@/server/repositories/periodo.repo";
import {
  HabilitacionInputSchema,
  PlazoGlobalSchema,
  PlazoInputSchema,
  PresupuestoInputSchema,
} from "@/shared/schemas/plazos";
import { invalidarEstadoPEI } from "./estado-cache";
import { catalogoIndicadores } from "./estado-pei.service";
import { notificarActoDePlazo } from "./notificaciones.service";

/**
 * Actos administrativos sobre la ventana de carga: fijar plazos, otorgar
 * prórrogas y habilitar/cerrar la carga (general o por alcance).
 * Todo queda registrado append-only en `VentanaCarga` con autor y motivo,
 * y notifica a las dependencias alcanzadas.
 */

export interface ResultadoPlazo {
  ok: boolean;
  mensaje: string;
}

function msg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof ZodError) return e.errors.map((x) => x.message).join(" · ");
  console.error("[plazos] error:", e);
  return "Error inesperado al procesar la operación.";
}

function refrescar(): void {
  invalidarEstadoPEI(); // limpia también el store "ventanas"
  invalidarPeriodos(); // fechaLimiteCarga sí cambia en runtime
  revalidatePath("/", "layout");
}

const fmt = (d: Date) =>
  d.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Asuncion",
  });

const ETIQUETA_SCOPE: Record<ScopeVentana, string> = {
  GLOBAL: "todo el ejercicio",
  OE: "el objetivo",
  AE: "la acción",
  INDICADOR: "el indicador",
  DEPENDENCIA: "la dependencia",
};

/** Dependencias responsables alcanzadas por un acto de plazo. */
async function dependenciasAlcanzadas(
  ctx: Ctx,
  scope: ScopeVentana,
  entidad: string,
): Promise<{ dependenciaIds: number[]; indicadorId: number | null; detalle: string }> {
  if (scope === "DEPENDENCIA") {
    const id = Number(entidad);
    const dep = await ctx.db.dependencia.findUnique({
      where: { id },
      select: { nombre: true },
    });
    return { dependenciaIds: [id], indicadorId: null, detalle: dep?.nombre ?? `Dependencia ${id}` };
  }
  const inds = await catalogoIndicadores(ctx);
  const alcanzados = inds.filter((i) => {
    if (scope === "GLOBAL") return true;
    if (scope === "OE") return i.oe.codigo === entidad;
    if (scope === "AE") return i.ae?.codigo === entidad;
    return String(i.codigo) === entidad;
  });
  const dependenciaIds = [
    ...new Set(alcanzados.flatMap((i) => i.responsables.map((r) => r.dependenciaId))),
  ];
  const detalle =
    scope === "INDICADOR" && alcanzados[0]
      ? `Indicador ${alcanzados[0].codigo} — ${alcanzados[0].nombre}`
      : scope === "GLOBAL"
        ? "todos los indicadores del ejercicio"
        : `${entidad} (${alcanzados.length} indicadores)`;
  return {
    dependenciaIds,
    indicadorId: scope === "INDICADOR" ? (alcanzados[0]?.id ?? null) : null,
    detalle,
  };
}

/** Solo ADMIN puede operar sobre el alcance GLOBAL. */
function exigirAlcance(ctx: Ctx, scope: ScopeVentana): void {
  if (scope === "GLOBAL" && !tieneRol(ctx.actor, "ADMIN")) throw sinPermiso();
}

/** Fija un plazo u otorga una prórroga para el alcance indicado. */
export async function fijarPlazoAction(input: unknown): Promise<ResultadoPlazo> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = PlazoInputSchema.parse(input);
    if (d.tipo === "PLAZO") exigirAlcance(ctx, d.scope);

    const periodo = await periodoAnual(ctx, d.anio);
    await ctx.db.ventanaCarga.create({
      data: {
        periodoId: periodo.id,
        scope: d.scope,
        entidad: d.entidad,
        tipo: d.tipo,
        fechaLimite: d.fechaLimite,
        motivo: d.motivo ?? null,
        usuarioId: ctx.actor.userId,
      },
    });
    const { dependenciaIds, indicadorId, detalle } = await dependenciasAlcanzadas(
      ctx,
      d.scope,
      d.entidad,
    );
    if (d.tipo === "PRORROGA") {
      await notificarActoDePlazo(ctx, {
        tipo: "PRORROGA_OTORGADA",
        dependenciaIds,
        indicadorId,
        titulo: "La DGPD otorgó una prórroga de carga",
        cuerpo: `Nuevo plazo: ${fmt(d.fechaLimite)} · alcance: ${detalle}${d.motivo ? `\n“${d.motivo}”` : ""}`,
        url: `/registro?anio=${d.anio}`,
      });
    }
    refrescar();
    return {
      ok: true,
      mensaje:
        d.tipo === "PRORROGA"
          ? `Prórroga otorgada hasta el ${fmt(d.fechaLimite)} para ${ETIQUETA_SCOPE[d.scope]}.`
          : `Plazo fijado al ${fmt(d.fechaLimite)} para ${ETIQUETA_SCOPE[d.scope]}.`,
    };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Habilita o cierra la carga manualmente. */
export async function habilitarCargaAction(input: unknown): Promise<ResultadoPlazo> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = HabilitacionInputSchema.parse(input);
    exigirAlcance(ctx, d.scope);

    const periodo = await periodoAnual(ctx, d.anio);
    await ctx.db.ventanaCarga.create({
      data: {
        periodoId: periodo.id,
        scope: d.scope,
        entidad: d.entidad,
        tipo: d.tipo,
        fechaLimite: null,
        motivo: d.motivo ?? null,
        usuarioId: ctx.actor.userId,
      },
    });
    const { dependenciaIds, indicadorId, detalle } = await dependenciasAlcanzadas(
      ctx,
      d.scope,
      d.entidad,
    );
    const abre = d.tipo === "APERTURA";
    await notificarActoDePlazo(ctx, {
      tipo: abre ? "CARGA_HABILITADA" : "CARGA_CERRADA",
      dependenciaIds,
      indicadorId,
      titulo: abre
        ? "La DGPD habilitó la carga"
        : "La DGPD cerró la carga",
      cuerpo: `Alcance: ${detalle}${d.motivo ? `\n“${d.motivo}”` : ""}`,
      url: `/registro?anio=${d.anio}`,
    });
    refrescar();
    return {
      ok: true,
      mensaje: abre
        ? `Carga habilitada para ${ETIQUETA_SCOPE[d.scope]}.`
        : `Carga cerrada para ${ETIQUETA_SCOPE[d.scope]}.`,
    };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Plazo por defecto del ejercicio (Periodo.fechaLimiteCarga). Solo ADMIN. */
export async function fijarPlazoGlobalAction(
  input: unknown,
): Promise<ResultadoPlazo> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = PlazoGlobalSchema.parse(input);
    const periodo = await periodoAnual(ctx, d.anio);
    await ctx.db.periodo.update({
      where: { id: periodo.id },
      data: { fechaLimiteCarga: d.fechaLimite },
    });
    refrescar();
    return {
      ok: true,
      mensaje: d.fechaLimite
        ? `Plazo general del ejercicio ${d.anio} fijado al ${fmt(d.fechaLimite)}.`
        : `Plazo general del ejercicio ${d.anio} eliminado: la carga queda abierta.`,
    };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Ejecución presupuestaria del ejercicio (Reporte Ejecutivo). Solo ADMIN. */
export async function guardarPresupuestoAction(
  input: unknown,
): Promise<ResultadoPlazo> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = PresupuestoInputSchema.parse(input);
    await ctx.db.presupuestoEjercicio.upsert({
      where: { anio: d.anio },
      create: {
        anio: d.anio,
        asignado: d.asignado,
        ejecutado: d.ejecutado,
        usuarioId: ctx.actor.userId,
      },
      update: {
        asignado: d.asignado,
        ejecutado: d.ejecutado,
        usuarioId: ctx.actor.userId,
      },
    });
    refrescar();
    return { ok: true, mensaje: `Ejecución presupuestaria ${d.anio} actualizada.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}
