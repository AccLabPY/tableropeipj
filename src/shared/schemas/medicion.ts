import { z } from "zod";

/** Alta/edición de una medición (borrador). */
export const MedicionInputSchema = z
  .object({
    indicadorCodigo: z.coerce.number().int().min(1).max(9999),
    anio: z.coerce.number().int().min(2026).max(2030),
    /** Variables base de la fórmula: {"a":..,"b":..} · {..,"c":..} · {"valor":..}.
     *  El backend calcula el valor observado con la fórmula del indicador. */
    valores: z
      .record(
        z.string().regex(/^[a-z]$|^valor$/),
        z.coerce.number().finite(),
      )
      .nullish(),
    nivelEscala: z.coerce.number().int().min(1).max(10).nullish(),
    // Compatibilidad con la API v1 previa:
    numerador: z.coerce.number().finite().nullish(),
    denominador: z.coerce.number().finite().nullish(),
    valorObservado: z.coerce.number().finite().nullish(),
    fuente: z.string().max(300).nullish(),
    observaciones: z.string().max(2000).nullish(),
    fechaCorte: z.coerce.date().nullish(),
  })
  .refine(
    (d) =>
      (d.valores != null && Object.keys(d.valores).length > 0) ||
      d.nivelEscala != null ||
      d.valorObservado != null ||
      (d.numerador != null && d.denominador != null),
    {
      message:
        "Debe informar las variables de la fórmula, el nivel de escala o el valor observado.",
    },
  )
  .refine((d) => d.denominador == null || d.denominador !== 0, {
    message: "El denominador no puede ser cero.",
    path: ["denominador"],
  });

export type MedicionInput = z.infer<typeof MedicionInputSchema>;

/**
 * Resolución de la DGPD. Por decisión institucional (2026) el rechazo se
 * retiró del circuito: una carga incorrecta se OBSERVA para su corrección.
 * RECHAZADO subsiste en la BD solo para las mediciones históricas.
 */
export const ValidarInputSchema = z.object({
  resultado: z.enum(["APROBADO", "OBSERVADO"]),
  comentario: z.string().max(2000).nullish(),
});
export type ValidarInput = z.infer<typeof ValidarInputSchema>;

export const EvidenciaInputSchema = z.object({
  nombreArchivo: z.string().min(1).max(255),
  tipo: z.string().max(100).nullish(),
  rutaOUrl: z.string().min(1).max(1000),
  hashSha256: z.string().length(64).nullish(),
});
export type EvidenciaInput = z.infer<typeof EvidenciaInputSchema>;
