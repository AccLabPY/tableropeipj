import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases Tailwind resolviendo conflictos (patrón shadcn). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nfEs = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 2 });
const nfEsInt = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

/** Formato numérico es-PY (punto de miles, coma decimal). null/undefined → "—". */
export function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number.isInteger(v) ? nfEsInt.format(v) : nfEs.format(v);
}

/** Fracción 0..1 → "83%" (redondeado). null → "—". */
export function fmtPct(frac: number | null | undefined): string {
  if (frac === null || frac === undefined || Number.isNaN(frac)) return "—";
  return `${Math.round(Math.max(0, frac) * 100)}%`;
}

/** Valor + sufijo de unidad para mostrar ("%", "", "pts"). */
export function fmtValor(
  v: number | null | undefined,
  unidad: string,
): string {
  if (v === null || v === undefined) return "—";
  const sufijo = unidad === "PORCENTAJE" ? "%" : "";
  return `${fmtNum(v)}${sufijo}`;
}

const fechaLarga = new Intl.DateTimeFormat("es-PY", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function fmtFechaLarga(d: Date): string {
  const s = fechaLarga.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  // Las fechas de corte/reporte se persisten como instantes UTC (00:00Z):
  // se renderizan en UTC para no correr el día calendario en huso local.
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
