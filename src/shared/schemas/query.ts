import { z } from "zod";

export const AnioQuery = z.coerce
  .number()
  .int()
  .min(2025)
  .max(2030)
  .default(2026);

export const IndicadoresQuery = z.object({
  anio: AnioQuery,
  oe: z
    .string()
    .regex(/^OE[1-6]$/)
    .optional(),
  estado: z.enum(["VERDE", "AMARILLO", "ROJO", "GRIS"]).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const CodigoParam = z.coerce.number().int().min(1).max(9999);
