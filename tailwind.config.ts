import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import plugin from "tailwindcss/plugin";

/**
 * Design system con DOS temas (ver tokens en src/app/globals.css):
 *  - Clásico institucional (CSJ): navy, serif, sobrio.
 *  - Agentes PEI (PNUD): Poppins, azul/magenta/naranja, crema, pills.
 * Todos los colores/radios/sombras/fuentes apuntan a variables CSS; el tema
 * se decide en el servidor con <html data-theme="…">.
 */
const c = (v: string) => `rgb(var(--c-${v}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      xs: "420px",
      ...defaultTheme.screens,
    },
    extend: {
      maxWidth: {
        pj: "1440px",
      },
      colors: {
        navy: { DEFAULT: c("navy"), 2: c("navy-2") },
        azul: {
          DEFAULT: c("azul"),
          d: c("azul-d"),
          soft: c("azul-soft"),
          "soft-hover": c("azul-soft-hover"),
          line: c("azul-line"),
        },
        marca: { 2: c("marca-2"), 3: c("marca-3"), "3-d": c("marca-3-d") },
        "on-marca": { DEFAULT: c("on-marca"), 2: c("on-marca-2") },
        fondo: c("fondo"),
        superficie: c("superficie"),
        linea: { DEFAULT: c("linea"), 2: c("linea-2") },
        tinta: c("tinta"),
        muted: { DEFAULT: c("muted"), 2: c("muted-2") },
        hover: c("hover"),
        zebra: c("zebra"),
        "meta-serie": c("meta-serie"),
        sem: {
          verde: c("sem-verde"),
          "verde-bg": c("sem-verde-bg"),
          "verde-fg": c("sem-verde-fg"),
          "verde-border": c("sem-verde-border"),
          ambar: c("sem-ambar"),
          "ambar-bg": c("sem-ambar-bg"),
          "ambar-fg": c("sem-ambar-fg"),
          "ambar-border": c("sem-ambar-border"),
          rojo: c("sem-rojo"),
          "rojo-bg": c("sem-rojo-bg"),
          "rojo-fg": c("sem-rojo-fg"),
          "rojo-border": c("sem-rojo-border"),
          gris: c("sem-gris"),
          "gris-bg": c("sem-gris-bg"),
        },
        purpura: {
          DEFAULT: c("purpura"),
          bg: c("purpura-bg"),
          border: c("purpura-border"),
        },
      },
      fontFamily: {
        // `font-serif` = tipografía de títulos (display); `font-sans` = cuerpo.
        serif: ["var(--font-display)"],
        sans: ["var(--font-body)"],
      },
      boxShadow: {
        card: "var(--shadow-card)",
        toast: "var(--shadow-toast)",
      },
      borderRadius: {
        pj: "var(--r)",
        "pj-sm": "var(--r-sm)",
        chip: "var(--r-chip)",
      },
      backgroundImage: {
        marca: "var(--grad-marca)",
        accion: "var(--grad-accion)",
        hero: "var(--grad-hero)",
      },
      fontSize: {
        "2xs": ["10.5px", "1.3"],
        // Escala fluida: evita cifras y titulares desbordados por debajo de 420px
        kpi: ["clamp(21px, 6vw, 30px)", "1.1"],
        seccion: ["clamp(18px, 4.5vw, 26px)", "1.15"],
        titulo: ["clamp(17px, 4vw, 22px)", "1.2"],
      },
    },
  },
  plugins: [
    // Variantes por tema para estilos estructurales opt-in:
    //   agentes:bg-marca  → solo bajo [data-theme="agentes"]
    //   clasico:…         → solo en el tema clásico
    plugin(({ addVariant }) => {
      addVariant("agentes", '[data-theme="agentes"] &');
      addVariant(
        "clasico",
        ':root:not([data-theme="agentes"]) &, [data-theme="clasico"] &',
      );
    }),
  ],
};
export default config;
