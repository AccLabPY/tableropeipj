import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { enviar } from "@/server/services/medicion.service";
import { toMedicionResumen } from "@/server/services/medicion-dto";

export const dynamic = "force-dynamic";

/** POST /api/v1/mediciones/:id/enviar — BORRADOR/OBSERVADO → ENVIADO. */
export const POST = manejar<{ params: { id: string } }>(
  async (_req, { params }) => {
    const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
    const ctx = await getCtx(actor);
    const m = await enviar(ctx, z.coerce.bigint().parse(params.id));
    return ok(toMedicionResumen(m));
  },
);
