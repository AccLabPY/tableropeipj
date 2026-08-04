import type { Prisma } from "@prisma/client";
import type { Ctx } from "@/server/db/env";
import { ROLES_VISION_TOTAL, tieneRol, type Actor } from "@/server/auth/guards";

/**
 * Repositorio de mediciones. SCOPING FORZADO ACÁ, nunca en componentes:
 * DEPENDENCIA_CARGA solo ve mediciones de sus dependencias; los roles de
 * visión total (ADMIN/DGPD/AUTORIDAD/CONSULTA) ven todo.
 */

export function scopeMediciones(actor: Actor): Prisma.MedicionWhereInput {
  if (tieneRol(actor, ...ROLES_VISION_TOTAL)) return {};
  return { dependenciaId: { in: actor.dependenciaIds } };
}

export const INCLUDE_MEDICION = {
  dependencia: true,
  periodo: true,
  evidencias: { orderBy: { fecha: "desc" as const } },
  validaciones: { orderBy: { fecha: "desc" as const } },
  historial: { orderBy: { fecha: "asc" as const } },
} satisfies Prisma.MedicionInclude;

export type MedicionCompleta = Prisma.MedicionGetPayload<{
  include: typeof INCLUDE_MEDICION;
}>;

/** Versión para fichas/DTOs: igual pero SIN historial (ahorra un round-trip). */
export const INCLUDE_MEDICION_FICHA = {
  dependencia: true,
  periodo: true,
  evidencias: { orderBy: { fecha: "desc" as const } },
  validaciones: { orderBy: { fecha: "desc" as const } },
} satisfies Prisma.MedicionInclude;

export type MedicionParaDTO = Prisma.MedicionGetPayload<{
  include: typeof INCLUDE_MEDICION_FICHA;
}>;

/** Fila mínima que necesita el cómputo del dashboard (1 solo query). */
export interface MedicionLigera {
  indicadorId: number;
  estado: string;
  version: number;
  valorObservado: unknown;
}

/** Mediciones del período en versión LIGERA (sin includes — camino caliente
 *  del dashboard, que solo computa sobre APROBADAS). */
export async function delPeriodoLigero(
  ctx: Ctx,
  periodoId: number,
): Promise<MedicionLigera[]> {
  return ctx.db.medicion.findMany({
    where: { periodoId },
    select: {
      indicadorId: true,
      estado: true,
      version: true,
      valorObservado: true,
    },
    orderBy: [{ indicadorId: "asc" }, { version: "asc" }],
  });
}

/** Mediciones visibles para el actor (Registro / gobernanza operativa). */
export async function visiblesDelPeriodo(
  ctx: Ctx,
  periodoId: number,
): Promise<MedicionCompleta[]> {
  return ctx.db.medicion.findMany({
    where: { periodoId, ...scopeMediciones(ctx.actor) },
    include: INCLUDE_MEDICION,
    orderBy: [{ indicadorId: "asc" }, { version: "asc" }],
  });
}

export async function porId(
  ctx: Ctx,
  id: bigint,
): Promise<MedicionCompleta | null> {
  return ctx.db.medicion.findFirst({
    where: { id, ...scopeMediciones(ctx.actor) },
    include: INCLUDE_MEDICION,
  });
}

export async function deIndicador(
  ctx: Ctx,
  indicadorId: number,
): Promise<MedicionParaDTO[]> {
  return ctx.db.medicion.findMany({
    where: { indicadorId, ...scopeMediciones(ctx.actor) },
    include: INCLUDE_MEDICION_FICHA,
    orderBy: [{ periodoId: "desc" }, { version: "desc" }],
  });
}

/** Include mínimo para el widget de últimas cargas. */
export const INCLUDE_ULTIMA_CARGA = {
  indicador: { select: { codigo: true, nombre: true, unidad: true } },
  periodo: { select: { anio: true } },
  dependencia: { select: { nombre: true } },
} satisfies Prisma.MedicionInclude;

export type MedicionUltimaCarga = Prisma.MedicionGetPayload<{
  include: typeof INCLUDE_ULTIMA_CARGA;
}>;

/**
 * Últimas mediciones APROBADAS de cualquier período (widget "últimas cargas"
 * del tablero). Sin scoping: lo aprobado es información pública del tablero.
 */
export async function ultimasAprobadas(
  ctx: Ctx,
  n = 8,
): Promise<MedicionUltimaCarga[]> {
  return ctx.db.medicion.findMany({
    where: { estado: "APROBADO" },
    include: INCLUDE_ULTIMA_CARGA,
    orderBy: [{ fechaReporte: "desc" }, { id: "desc" }],
    take: n,
  });
}

/**
 * De una lista de mediciones de un indicador+período, la APROBADA VIGENTE:
 * mayor versión con estado APROBADO (las RECTIFICADO quedaron superadas).
 */
export function aprobadaVigente<T extends { estado: string; version: number }>(
  mediciones: T[],
): T | null {
  const aprobadas = mediciones.filter((m) => m.estado === "APROBADO");
  if (!aprobadas.length) return null;
  return aprobadas.reduce((a, b) => (b.version > a.version ? b : a));
}

/** Última versión (cualquier estado) — para chips de workflow. */
export function ultimaVersion<T extends { version: number }>(
  mediciones: T[],
): T | null {
  if (!mediciones.length) return null;
  return mediciones.reduce((a, b) => (b.version > a.version ? b : a));
}
