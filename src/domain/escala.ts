/**
 * Indicadores "de escala" (~29): reportan un NIVEL cualitativo que mapea a un
 * porcentaje de avance según la escala definida en la ficha del indicador.
 * Convención aprobada: el porcentaje del nivel es su cota superior (pctMax) —
 * alcanzar el "Nivel de Planificación (25%)" equivale a un avance del 25%.
 */

export interface NivelEscala {
  nivel: number;
  descripcion?: string;
  pctMin: number;
  pctMax: number;
}

/** % de avance (0..100) para el nivel reportado; null si el nivel no existe. */
export function pctDeNivel(
  escala: NivelEscala[],
  nivel: number | null,
): number | null {
  if (nivel === null) return null;
  const n = escala.find((e) => e.nivel === nivel);
  return n ? n.pctMax : null;
}

/** Nivel que corresponde a un % de avance dado (para mostrar en fichas). */
export function nivelDePct(
  escala: NivelEscala[],
  pct: number | null,
): NivelEscala | null {
  if (pct === null) return null;
  const ordenada = [...escala].sort((a, b) => a.nivel - b.nivel);
  for (const n of ordenada) {
    if (pct <= n.pctMax) return n;
  }
  return ordenada.length ? ordenada[ordenada.length - 1] : null;
}

/**
 * Nivel ALCANZADO para un % editable (convención 2026): el mayor nivel cuyo
 * pctMax es ≤ al porcentaje reportado. Un 35% con niveles al 20/40/60/80/100
 * alcanza el nivel 1 (superó su cota) y está en camino al nivel 2.
 * El nivel 0 "Preparativos" (pctMax 0) absorbe todo avance previo al primer
 * umbral. Devuelve null si no hay escala o el % es null.
 */
export function nivelAlcanzado(
  escala: NivelEscala[],
  pct: number | null,
): NivelEscala | null {
  if (pct === null || escala.length === 0) return null;
  const ordenada = [...escala].sort((a, b) => a.nivel - b.nivel);
  let alcanzado: NivelEscala | null = null;
  for (const n of ordenada) {
    if (n.pctMax <= pct) alcanzado = n;
  }
  return alcanzado;
}
