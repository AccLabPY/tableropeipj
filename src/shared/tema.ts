/** Temas visuales de la plataforma (ver tokens en src/app/globals.css). */
export const TEMAS = ["agentes", "clasico"] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_DEFAULT: Tema = "agentes";

export const TEMA_LABEL: Record<Tema, string> = {
  agentes: "Agentes PEI",
  clasico: "Clásico",
};

export function esTema(v: unknown): v is Tema {
  return typeof v === "string" && (TEMAS as readonly string[]).includes(v);
}
