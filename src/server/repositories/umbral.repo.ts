import type { Ctx } from "@/server/db/env";
import { claveUmbral, pctAUmbral } from "@/domain/umbrales";
import type { Umbral } from "@/domain/types";

export interface UmbralRow {
  id: number;
  scope: "GLOBAL" | "OE" | "AE" | "INDICADOR";
  entidad: string;
  verde: number;
  amarillo: number;
  azul: number | null;
}

/** Registro completo de umbrales indexado por "SCOPE:entidad" (fracciones). */
export async function registroUmbrales(
  ctx: Ctx,
): Promise<Map<string, Umbral>> {
  const filas = await ctx.db.umbralCriticidad.findMany();
  const mapa = new Map<string, Umbral>();
  for (const f of filas) {
    mapa.set(
      claveUmbral(f.scope, f.entidad),
      pctAUmbral({ verde: f.verde, amarillo: f.amarillo, azul: f.azul }),
    );
  }
  return mapa;
}

export async function listarUmbrales(ctx: Ctx): Promise<UmbralRow[]> {
  const filas = await ctx.db.umbralCriticidad.findMany({
    orderBy: [{ scope: "asc" }, { entidad: "asc" }],
  });
  return filas.map((f) => ({
    id: f.id,
    scope: f.scope,
    entidad: f.entidad,
    verde: f.verde,
    amarillo: f.amarillo,
    azul: f.azul,
  }));
}
