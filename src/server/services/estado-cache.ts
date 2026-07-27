import { cache } from "react";
import type { Ctx } from "@/server/db/env";
import type { EstadoPeiDTO } from "@/shared/dtos/estado-pei";
import { calcularEstadoPEI } from "./estado-pei.service";
import { conTTL, TTL_CORTO } from "./cache";

/**
 * Estado computado del PEI, cacheado en dos capas:
 *  1. React cache(): dedupe dentro del mismo request.
 *  2. TTL + stale-while-revalidate por proceso (clave `${env}:${anio}`): las
 *     navegaciones no tocan TiDB y una entrada vencida se sirve al instante
 *     mientras se refresca en background.
 * Las mutaciones invalidan explícitamente vía invalidarEstadoPEI().
 */
export { invalidarEstadoPEI } from "./cache";

/** Estado del PEI cacheado. Usar SIEMPRE esta función en páginas y API. */
export const estadoPEI = cache(
  (ctx: Ctx, anio: number): Promise<EstadoPeiDTO> =>
    conTTL("estado", `${ctx.env}:${anio}`, TTL_CORTO, true, () =>
      calcularEstadoPEI(ctx, anio),
    ),
);
