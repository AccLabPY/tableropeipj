import type { Prisma } from "@prisma/client";
import type { Ctx } from "@/server/db/env";

export const INCLUDE_RIESGO = {
  oe: { select: { codigo: true, nombre: true } },
} satisfies Prisma.RiesgoInclude;

export type RiesgoCompleto = Prisma.RiesgoGetPayload<{
  include: typeof INCLUDE_RIESGO;
}>;

/** Riesgos estratégicos del PEI, ordenados por OE y criticidad. */
export async function listarRiesgos(ctx: Ctx): Promise<RiesgoCompleto[]> {
  return ctx.db.riesgo.findMany({
    include: INCLUDE_RIESGO,
    orderBy: [{ oeId: "asc" }, { probabilidad: "desc" }, { impacto: "desc" }],
  });
}
