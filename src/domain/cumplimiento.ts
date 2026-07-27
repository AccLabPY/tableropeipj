import type { EntradaCumplimiento, ResultadoCumplimiento } from "./types";

/**
 * Motor de cumplimiento (§6 del prompt maestro — fórmula canónica).
 *
 * El cumplimiento se calcula NORMALIZADO por sentido y línea base.
 * PROHIBIDO `valor/meta`:
 *   ASC  con M>B:  (V−B)/(M−B)      · ASC  con M=B: V≥M ? 1 : V/M
 *   DESC con B>M:  (B−V)/(B−M)      · DESC con B=M: V≤M ? 1 : 0
 * base null → PENDIENTE_BASE · meta 0 o concluida → NO_APLICA
 * `capado = clamp(real, 0, 1)` alimenta agregaciones y semáforo.
 */
export function calcularCumplimiento(
  e: EntradaCumplimiento,
): ResultadoCumplimiento {
  if (e.base === null) {
    return { real: null, capado: null, estado: "PENDIENTE_BASE" };
  }
  if (e.metaConcluida) {
    return { real: null, capado: null, estado: "NO_APLICA" };
  }
  if (e.valor === null || e.meta === null) {
    return { real: null, capado: null, estado: "SIN_DATO" };
  }
  if (e.meta === 0) {
    return { real: null, capado: null, estado: "NO_APLICA" };
  }

  const B = e.base;
  const M = e.meta;
  const V = e.valor;

  let real: number;
  if (e.sentido === "ASC") {
    real = M > B ? (V - B) / (M - B) : V >= M ? 1 : V / M;
  } else {
    // DESC: bajar es cumplir
    real = B > M ? (B - V) / (B - M) : V <= M ? 1 : 0;
  }
  return { real, capado: Math.max(0, Math.min(1, real)), estado: "OK" };
}
