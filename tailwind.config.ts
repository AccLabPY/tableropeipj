import type { Config } from "tailwindcss";

/**
 * Design system institucional del Poder Judicial (§10 del prompt maestro).
 * Tokens portados 1:1 del prototipo HTML de referencia (tablero_pei.html).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#14395B", 2: "#0F2C46" },
        azul: {
          DEFAULT: "#1E6FA8",
          d: "#175A8A",
          soft: "#EAF2F8",
          line: "#CFE0EC",
        },
        fondo: "#F3F5F7",
        superficie: "#FFFFFF",
        linea: { DEFAULT: "#E2E7EC", 2: "#EDF0F3" },
        tinta: "#26303A",
        muted: { DEFAULT: "#6A7581", 2: "#8A94A0" },
        sem: {
          verde: "#2E8B60",
          "verde-bg": "#E7F3EC",
          ambar: "#C08A1E",
          "ambar-bg": "#FAF2DF",
          rojo: "#B23B3B",
          "rojo-bg": "#F7E7E7",
          gris: "#93A0AC",
          "gris-bg": "#EEF1F4",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,57,91,.06), 0 1px 3px rgba(20,57,91,.05)",
        toast: "0 6px 20px rgba(20,57,91,.28)",
      },
      borderRadius: {
        pj: "4px",
        "pj-sm": "3px",
      },
      fontSize: {
        "2xs": ["10.5px", "1.3"],
      },
    },
  },
  plugins: [],
};
export default config;
