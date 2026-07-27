import type { Cobertura, Semaforo } from "./types";

/**
 * Agregaciones jerárquicas (§6): avance AE = promedio ponderado (peso) del
 * `capado` de sus indicadores con estado OK; avance OE = promedio de sus AE;
 * índice PEI = promedio de OE. La cobertura SIEMPRE acompaña al cumplimiento.
 */

export interface ItemAgregable {
  /** Cumplimiento capado [0,1]; null si no computa (gris/sin dato). */
  capado: number | null;
  /** Peso relativo del indicador (default 1). */
  peso?: number;
}

/**
 * Promedio ponderado de los items con dato. Devuelve null si ninguno computa.
 * Los items con `capado === null` se EXCLUYEN del promedio (no valen 0),
 * pero cuentan en la cobertura.
 */
export function promedioPonderado(items: ItemAgregable[]): number | null {
  let suma = 0;
  let pesoTotal = 0;
  for (const it of items) {
    if (it.capado === null) continue;
    const p = it.peso ?? 1;
    if (p <= 0) continue;
    suma += it.capado * p;
    pesoTotal += p;
  }
  return pesoTotal > 0 ? suma / pesoTotal : null;
}

/** Avance de una Acción Estratégica a partir de sus indicadores. */
export function avanceAE(indicadores: ItemAgregable[]): number | null {
  return promedioPonderado(indicadores);
}

/** Avance de un OE a partir de los avances de sus AE (promedio simple). */
export function avanceOE(avancesAE: (number | null)[]): number | null {
  const conDato = avancesAE.filter((v): v is number => v !== null);
  if (conDato.length === 0) return null;
  return conDato.reduce((a, b) => a + b, 0) / conDato.length;
}

/** Índice PEI = promedio (ponderado) de los avances de OE. */
export function indicePEI(
  oes: { avance: number | null; peso?: number }[],
): number | null {
  return promedioPonderado(oes.map((o) => ({ capado: o.avance, peso: o.peso })));
}

/** Cobertura de reporte: aprobadas / esperadas. */
export function cobertura(aprobadas: number, esperadas: number): Cobertura {
  return {
    aprobadas,
    esperadas,
    fraccion: esperadas > 0 ? aprobadas / esperadas : 0,
  };
}

/** Conteo por color para el donut de distribución. */
export function distribucionSemaforo(
  sems: Semaforo[],
): Record<Semaforo, number> {
  const d: Record<Semaforo, number> = {
    VERDE: 0,
    AMARILLO: 0,
    ROJO: 0,
    GRIS: 0,
  };
  for (const s of sems) d[s]++;
  return d;
}
