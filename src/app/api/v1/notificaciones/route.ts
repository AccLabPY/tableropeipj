import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import {
  emitirAvisosVencimiento,
  listarNotificaciones,
} from "@/server/services/notificaciones.service";
import { ANIO_REFERENCIA, ANIOS_PEI } from "@/shared/constants";

export const dynamic = "force-dynamic";

const LimiteQuery = z.coerce.number().int().min(1).max(50).catch(15);

/** GET /api/v1/notificaciones?limite — bandeja del actor + conteo no leídas. */
export const GET = manejar(async (req) => {
  const actor = await requireApi();
  const ctx = await getCtx(actor);
  const limite = LimiteQuery.parse(
    new URL(req.url).searchParams.get("limite") ?? undefined,
  );
  // Evaluación perezosa de vencimientos (throttle horario dentro del service).
  const anioVigente = ANIOS_PEI.find((a) => a >= new Date().getFullYear()) ?? ANIO_REFERENCIA;
  await emitirAvisosVencimiento(ctx, anioVigente);
  const { items, noLeidas } = await listarNotificaciones(ctx, limite);
  return ok(items, { noLeidas });
});
