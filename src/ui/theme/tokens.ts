/**
 * Tokens de color para uso FUERA de Tailwind (Recharts, SVG inline,
 * `style={{}}`). Son referencias a las variables CSS del tema activo
 * (src/app/globals.css), por lo que heredan el tema automáticamente —
 * Recharts y los estilos inline aceptan `rgb(var(--x))` como valor.
 */
const v = (nombre: string) => `rgb(var(--c-${nombre}))`;

export const COLORS = {
  navy: v("navy"),
  navy2: v("navy-2"),
  azul: v("azul"),
  azulD: v("azul-d"),
  azulSoft: v("azul-soft"),
  azulLine: v("azul-line"),
  marca2: v("marca-2"),
  marca3: v("marca-3"),
  fondo: v("fondo"),
  superficie: v("superficie"),
  linea: v("linea"),
  linea2: v("linea-2"),
  tinta: v("tinta"),
  muted: v("muted"),
  muted2: v("muted-2"),
} as const;

/** Colores del semáforo de cumplimiento (con fondos suaves para pills). */
export const SEM_COLORS = {
  VERDE: v("sem-verde"),
  AMARILLO: v("sem-ambar"),
  ROJO: v("sem-rojo"),
  GRIS: v("sem-gris"),
  AZUL: v("azul"), // sobrecumplimiento (opcional)
} as const;

export const SEM_BG = {
  VERDE: v("sem-verde-bg"),
  AMARILLO: v("sem-ambar-bg"),
  ROJO: v("sem-rojo-bg"),
  GRIS: v("sem-gris-bg"),
  AZUL: v("azul-soft"),
} as const;

/** Color para la serie de meta planificada en las gráficas temporales. */
export const META_SERIES_COLOR = v("meta-serie");
