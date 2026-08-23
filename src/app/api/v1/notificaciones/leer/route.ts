import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import {
  marcarLeida,
  marcarTodasLeidas,
} from "@/server/services/notificaciones.service";

export const dynamic = "force-dynamic";

const LeerSchema = z.union([
  z.object({ id: z.string().regex(/^\d+$/) }),
  z.object({ todas: z.literal(true) }),
]);

/** POST /api/v1/notificaciones/leer — marca una notificación (o todas) como leída. */
export const POST = manejar(async (req) => {
  const actor = await requireApi();
  const ctx = await getCtx(actor);
  const input = LeerSchema.parse(await req.json());
  if ("todas" in input) await marcarTodasLeidas(ctx);
  else await marcarLeida(ctx, BigInt(input.id));
  return ok({ ok: true });
});
