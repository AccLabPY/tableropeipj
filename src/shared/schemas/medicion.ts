import { z } from "zod";

/** Alta/edición de una medición (borrador). */
export const MedicionInputSchema = z
  .object({
    indicadorCodigo: z.coerce.number().int().min(1).max(9999),
    anio: z.coerce.number().int().min(2026).max(2030),
    numerador: z.coerce.number().finite().nullish(),
    denominador: z.coerce.number().finite().nullish(),
    nivelEscala: z.coerce.number().int().min(1).max(10).nullish(),
    valorObservado: z.coerce.number().finite().nullish(),
    fuente: z.string().max(300).nullish(),
    observaciones: z.string().max(2000).nullish(),
    fechaCorte: z.coerce.date().nullish(),
  })
  .refine(
    (d) =>
      d.valorObservado != null ||
      d.nivelEscala != null ||
      (d.numerador != null && d.denominador != null),
    {
      message:
        "Debe informar valor observado, nivel de escala o numerador y denominador.",
    },
  )
  .refine((d) => d.denominador == null || d.denominador !== 0, {
    message: "El denominador no puede ser cero.",
    path: ["denominador"],
  });

export type MedicionInput = z.infer<typeof MedicionInputSchema>;

export const ValidarInputSchema = z.object({
  resultado: z.enum(["APROBADO", "OBSERVADO", "RECHAZADO"]),
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
