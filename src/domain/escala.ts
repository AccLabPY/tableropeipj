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
