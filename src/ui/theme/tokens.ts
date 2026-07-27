/**
 * Tokens de color del design system institucional (§10).
 * Única fuente para colores usados fuera de Tailwind (Recharts, SVG inline).
 */
export const COLORS = {
  navy: "#14395B",
  navy2: "#0F2C46",
  azul: "#1E6FA8",
  azulD: "#175A8A",
  azulSoft: "#EAF2F8",
  azulLine: "#CFE0EC",
  fondo: "#F3F5F7",
  superficie: "#FFFFFF",
  linea: "#E2E7EC",
  linea2: "#EDF0F3",
  tinta: "#26303A",
  muted: "#6A7581",
  muted2: "#8A94A0",
} as const;

/** Colores del semáforo de cumplimiento (con fondos suaves para pills). */
export const SEM_COLORS = {
  VERDE: "#2E8B60",
  AMARILLO: "#C08A1E",
  ROJO: "#B23B3B",
  GRIS: "#93A0AC",
  AZUL: "#1E6FA8", // sobrecumplimiento (opcional)
} as const;

export const SEM_BG = {
  VERDE: "#E7F3EC",
  AMARILLO: "#FAF2DF",
  ROJO: "#F7E7E7",
  GRIS: "#EEF1F4",
  AZUL: "#EAF2F8",
} as const;

/** Color para la serie de meta planificada en las gráficas temporales. */
export const META_SERIES_COLOR = "#9AA6B1";
