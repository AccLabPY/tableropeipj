/**
 * Loader tipado del dataset canónico. Usado por el seed y por data:verify.
 * (Módulo de scripts Node — no se importa desde la app.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = join(process.cwd(), "prisma", "data");

export interface ObjetivoJson {
  id: number;
  codigo: string;
  nombre: string;
  pnd: string[];
  ods: number[];
}

export interface AccionJson {
  codigo: string;
  oe: number;
  nombre: string;
}

export interface EscalaJson {
  nivel: number;
  descripcion: string;
  pctMax: number;
}

export interface IndicadorJson {
  codigo: number;
  nivel: "OE" | "AE";
  oe: number;
  ae: string | null;
  nombre: string;
  descripcion: string | null;
  variables: string | null;
  formula: string | null;
  dimension: string | null;
  ambito: string | null;
  unidad: "PORCENTAJE" | "NUMERO" | "PUNTAJE" | "INDICE";
  sentido: "ASC" | "DESC";
  lineaBase: number | null;
  anioLineaBase: number | null;
  lineaBaseNota?: string;
  metas: (number | null)[];
  dependencias: string[];
  fuentes?: string;
  comentarios: string | null;
  escala: EscalaJson[] | null;
}

export interface RiesgoJson {
  oe: number;
  descripcion: string;
  probabilidad: number;
  impacto: number;
  evaluacion: string;
  mitigacion: string;
}

export const ANIOS_PEI = [2026, 2027, 2028, 2029, 2030] as const;

/** Códigos que requieren diagnóstico/investigación previa (DOCX oficial). */
export const CODIGOS_DIAGNOSTICO = new Set<number>([
  1301, 1701, 2101, 2102, 2201, 3104, 3301, 3601, 3701, 3805, 4101, 4201,
  4701, 5101, 5402, 6401,
]);

function leer<T>(archivo: string): T {
  return JSON.parse(
    readFileSync(join(DATA_DIR, archivo), "utf-8"),
  ) as T;
}

export const cargarObjetivos = () => leer<ObjetivoJson[]>("objetivos.json");
export const cargarAcciones = () => leer<AccionJson[]>("acciones.json");
export const cargarIndicadores = () =>
  leer<IndicadorJson[]>("indicadores.json");
export const cargarRiesgos = () => leer<RiesgoJson[]>("riesgos.json");

/** Ciclo de vida: la serie termina en 0 después de años con meta > 0. */
export function esCicloVida(metas: (number | null)[]): boolean {
  const ultimo = metas[metas.length - 1];
  return ultimo === 0 && metas.some((m) => (m ?? 0) > 0);
}

/**
 * Marca los 0 POSTERIORES al pico como "periodo concluido" (no meta cero).
 * Ej.: [50, 100, 0, 0, 0] → los índices 2..4 son concluido.
 */
export function indicesConcluidos(metas: (number | null)[]): Set<number> {
  const out = new Set<number>();
  if (!esCicloVida(metas)) return out;
  let ultimoPositivo = -1;
  metas.forEach((m, i) => {
    if ((m ?? 0) > 0) ultimoPositivo = i;
  });
  metas.forEach((m, i) => {
    if (i > ultimoPositivo && m === 0) out.add(i);
  });
  return out;
}
