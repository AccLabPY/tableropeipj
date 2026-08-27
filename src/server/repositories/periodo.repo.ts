import type { Periodo } from "@prisma/client";
import type { Ctx } from "@/server/db/env";
import { noEncontrado } from "@/server/api/api-error";

/**
 * Los períodos anuales del PEI son estáticos (2026–2030, sembrados por seed):
 * se memoizan por proceso para ahorrar un round-trip por request.
 */
const g = globalThis as unknown as { __peiPeriodos?: Map<string, Periodo> };
const memo = (g.__peiPeriodos ??= new Map<string, Periodo>());

/**
 * Limpia el memo de períodos (llamar tras editar `fechaLimiteCarga`, que sí
 * cambia en runtime desde Administración → Plazos de carga).
 */
export function invalidarPeriodos(): void {
  memo.clear();
}

/** Período anual del año dado (numero=null impide findUnique compuesto). */
export async function periodoAnual(ctx: Ctx, anio: number): Promise<Periodo> {
  const key = `${ctx.env}:${anio}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const p = await ctx.db.periodo.findFirst({
    where: { anio, tipo: "ANUAL", numero: null },
  });
  if (!p) throw noEncontrado(`Período anual ${anio}`);
  memo.set(key, p);
  return p;
}
