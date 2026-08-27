import { z } from "zod";

/** Alcance de un acto administrativo sobre la ventana de carga. */
export const ScopeVentanaSchema = z.enum([
  "GLOBAL",
  "OE",
  "AE",
  "INDICADOR",
  "DEPENDENCIA",
]);

const base = {
  anio: z.coerce.number().int().min(2025).max(2030),
  scope: ScopeVentanaSchema,
  /** "GLOBAL" | "OE1" | "A.E.1.1" | "4202" | id de dependencia. */
  entidad: z.string().min(1).max(60),
};

/** Fija o extiende una fecha límite (PLAZO / PRORROGA). */
export const PlazoInputSchema = z.object({
  ...base,
  tipo: z.enum(["PLAZO", "PRORROGA"]),
  /** ISO date (yyyy-mm-dd) o datetime. */
  fechaLimite: z.coerce.date(),
  motivo: z.string().trim().max(500).nullish(),
});
export type PlazoInput = z.infer<typeof PlazoInputSchema>;

/** Habilita o cierra la carga manualmente (APERTURA / CIERRE). */
export const HabilitacionInputSchema = z.object({
  ...base,
  tipo: z.enum(["APERTURA", "CIERRE"]),
  motivo: z.string().trim().max(500).nullish(),
});
export type HabilitacionInput = z.infer<typeof HabilitacionInputSchema>;

/** Plazo por defecto del ejercicio (Periodo.fechaLimiteCarga). */
export const PlazoGlobalSchema = z.object({
  anio: z.coerce.number().int().min(2025).max(2030),
  fechaLimite: z.coerce.date().nullable(),
});

/** Ejecución presupuestaria del ejercicio (Reporte Ejecutivo). */
export const PresupuestoInputSchema = z.object({
  anio: z.coerce.number().int().min(2025).max(2030),
  asignado: z.coerce.number().min(0),
  ejecutado: z.coerce.number().min(0),
});
export type PresupuestoInput = z.infer<typeof PresupuestoInputSchema>;
