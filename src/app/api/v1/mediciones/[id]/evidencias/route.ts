import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { agregarEvidencia } from "@/server/services/medicion.service";
import { EvidenciaInputSchema } from "@/shared/schemas/medicion";

export const dynamic = "force-dynamic";

/** POST /api/v1/mediciones/:id/evidencias — metadatos + URL (no binario). */
export const POST = manejar<{ params: { id: string } }>(
  async (req, { params }) => {
    const actor = await requireApi("DEPENDENCIA_CARGA", "DGPD_VALIDADOR", "ADMIN");
    const ctx = await getCtx(actor);
    const input = EvidenciaInputSchema.parse(await req.json());
    await agregarEvidencia(ctx, z.coerce.bigint().parse(params.id), input);
    return ok({ agregada: true }, undefined, { status: 201 });
  },
);
