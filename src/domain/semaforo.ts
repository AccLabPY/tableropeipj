import type { Semaforo, Umbral } from "./types";
import { UMBRAL_GLOBAL_DEFAULT } from "./umbrales";

/**
 * Clasifica el cumplimiento capado [0,1] según el umbral efectivo (fracciones).
 * `capado === null` (pendiente de base / sin dato / no aplica) → GRIS.
 * Nunca hardcodear 0.90/0.70 fuera del registro global: el umbral llega resuelto.
 */
export function semaforo(
  capado: number | null,
  umbral: Umbral = UMBRAL_GLOBAL_DEFAULT,
): Semaforo {
  if (capado === null) return "GRIS";
  if (capado >= umbral.verde) return "VERDE";
  if (capado >= umbral.amarillo) return "AMARILLO";
  return "ROJO";
}

export const SEMAFORO_LABEL: Record<Semaforo, string> = {
  VERDE: "En meta",
  AMARILLO: "En riesgo",
  ROJO: "Crítico",
  GRIS: "Pendiente",
};
