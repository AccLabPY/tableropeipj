import type { Ctx } from "@/server/db/env";
import type { Prisma } from "@prisma/client";

/**
 * Repositorio de indicadores. Los dashboards institucionales muestran datos
 * agregados APROBADOS a todos los roles autenticados; el scoping por
 * dependencia aplica a la carga/edición de mediciones (medicion.repo).
 */

export const INCLUDE_COMPLETO = {
  oe: { include: { pnd: { include: { pnd: true } }, ods: { include: { ods: true } } } },
  ae: true,
  metas: true,
  escala: { orderBy: { nivel: "asc" as const } },
  responsables: { include: { dependencia: true } },
} satisfies Prisma.IndicadorInclude;

export type IndicadorCompleto = Prisma.IndicadorGetPayload<{
  include: typeof INCLUDE_COMPLETO;
}>;

export async function listarCompletos(ctx: Ctx): Promise<IndicadorCompleto[]> {
  return ctx.db.indicador.findMany({
    where: { activo: true },
    include: INCLUDE_COMPLETO,
    orderBy: { codigo: "asc" },
  });
}

export async function porCodigo(
  ctx: Ctx,
  codigo: number,
): Promise<IndicadorCompleto | null> {
  return ctx.db.indicador.findUnique({
    where: { codigo },
    include: INCLUDE_COMPLETO,
  });
}

/** Indicadores cargables por el actor (worklist del Registro). */
export async function cargablesPorActor(ctx: Ctx): Promise<IndicadorCompleto[]> {
  const esCargaScoped =
    ctx.actor.roles.includes("DEPENDENCIA_CARGA") &&
    !ctx.actor.roles.includes("ADMIN") &&
    !ctx.actor.roles.includes("DGPD_VALIDADOR");
  return ctx.db.indicador.findMany({
    where: {
      activo: true,
      ...(esCargaScoped
        ? {
            responsables: {
              some: { dependenciaId: { in: ctx.actor.dependenciaIds } },
            },
          }
        : {}),
    },
    include: INCLUDE_COMPLETO,
    orderBy: { codigo: "asc" },
  });
}
