import type { Ctx } from "@/server/db/env";
import { ultimasAprobadas } from "@/server/repositories/medicion.repo";
import type { UltimaCargaDTO } from "@/shared/dtos/ultimas-cargas";
import { conTTL, TTL_CORTO } from "./cache";
import { toUltimaCarga } from "./medicion-dto";

/**
 * Últimas mediciones aprobadas para el widget del tablero ejecutivo.
 * Cacheado por entorno; lo invalida cualquier mutación vía invalidarEstadoPEI().
 */
export function ultimasCargas(ctx: Ctx, n = 8): Promise<UltimaCargaDTO[]> {
  return conTTL("ultimas-cargas", `${ctx.env}:${n}`, TTL_CORTO, true, async () =>
    (await ultimasAprobadas(ctx, n)).map(toUltimaCarga),
  );
}
