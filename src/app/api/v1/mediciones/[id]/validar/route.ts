import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { validar } from "@/server/services/medicion.service";
import { toMedicionResumen } from "@/server/services/medicion-dto";
import { ValidarInputSchema } from "@/shared/schemas/medicion";

export const dynamic = "force-dynamic";

/** POST /api/v1/mediciones/:id/validar {resultado, comentario} — DGPD. */
export const POST = manejar<{ params: { id: string } }>(
  async (req, { params }) => {
    const actor = await requireApi("DGPD_VALIDADOR", "ADMIN");
    const ctx = await getCtx(actor);
    const input = ValidarInputSchema.parse(await req.json());
    const m = await validar(ctx, z.coerce.bigint().parse(params.id), input);
    return ok(toMedicionResumen(m));
  },
);
