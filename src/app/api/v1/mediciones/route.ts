import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { visiblesDelPeriodo } from "@/server/repositories/medicion.repo";
import { guardarBorrador } from "@/server/services/medicion.service";
import { toMedicionResumen } from "@/server/services/medicion-dto";
import { AnioQuery } from "@/shared/schemas/query";
import { MedicionInputSchema } from "@/shared/schemas/medicion";

export const dynamic = "force-dynamic";

/** GET /api/v1/mediciones?anio — mediciones visibles para el actor (scoped). */
export const GET = manejar(async (req) => {
  const actor = await requireApi();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(
    new URL(req.url).searchParams.get("anio") ?? undefined,
  );
  const periodo = await periodoAnual(ctx, anio);
  const filas = await visiblesDelPeriodo(ctx, periodo.id);
  return ok(filas.map(toMedicionResumen), { anio, total: filas.length });
});

/** POST /api/v1/mediciones — crea/actualiza el borrador del período. */
export const POST = manejar(async (req) => {
  const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
  const ctx = await getCtx(actor);
  const input = MedicionInputSchema.parse(await req.json());
  const m = await guardarBorrador(ctx, input);
  return ok(toMedicionResumen(m), undefined, { status: 201 });
});
