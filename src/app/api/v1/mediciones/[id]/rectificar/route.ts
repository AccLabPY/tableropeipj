import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { rectificar } from "@/server/services/medicion.service";
import { toMedicionResumen } from "@/server/services/medicion-dto";

export const dynamic = "force-dynamic";

const Body = z.object({ motivo: z.string().min(5).max(1000) });

/** POST /api/v1/mediciones/:id/rectificar — APROBADO→RECTIFICADO + nueva versión. */
export const POST = manejar<{ params: { id: string } }>(
  async (req, { params }) => {
    const actor = await requireApi("DGPD_VALIDADOR", "ADMIN");
    const ctx = await getCtx(actor);
    const { motivo } = Body.parse(await req.json());
    const nueva = await rectificar(ctx, z.coerce.bigint().parse(params.id), motivo);
    return ok(toMedicionResumen(nueva), undefined, { status: 201 });
  },
);
