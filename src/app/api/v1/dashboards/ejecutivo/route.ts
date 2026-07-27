import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";

export const dynamic = "force-dynamic";

/** GET /api/v1/dashboards/ejecutivo?anio=2026 — estado completo del PEI. */
export const GET = manejar(async (req) => {
  const actor = await requireApi();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(
    new URL(req.url).searchParams.get("anio") ?? undefined,
  );
  const data = await estadoPEI(ctx, anio);
  return ok(data);
});
