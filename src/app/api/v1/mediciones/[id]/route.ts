import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { porId } from "@/server/repositories/medicion.repo";
import { noEncontrado } from "@/server/api/api-error";
import { toMedicionResumen } from "@/server/services/medicion-dto";

export const dynamic = "force-dynamic";

const IdParam = z.coerce.bigint();

/** GET /api/v1/mediciones/:id — detalle (scoped por dependencia). */
export const GET = manejar<{ params: { id: string } }>(
  async (_req, { params }) => {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const m = await porId(ctx, IdParam.parse(params.id));
    if (!m) throw noEncontrado("Medición");
    return ok(toMedicionResumen(m));
  },
);
