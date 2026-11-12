import { z } from "zod";
import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import {
  emitirAvisosVencimiento,
  listarNotificaciones,
} from "@/server/services/notificaciones.service";
import { ANIOS_PEI } from "@/shared/constants";
import { ejerciciosAEvaluar } from "@/domain";

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
  // Incluye el ejercicio anterior: su plazo vence en el año siguiente.
  for (const anio of ejerciciosAEvaluar(new Date(), ANIOS_PEI)) {
    await emitirAvisosVencimiento(ctx, anio);
  }
  const { items, noLeidas } = await listarNotificaciones(ctx, limite);
  return ok(items, { noLeidas });
});
