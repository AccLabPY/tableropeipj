import { z } from "zod";

/** Edición de la matriz PEI (atributos del indicador + metas). */
export const IndicadorUpdateSchema = z.object({
  codigo: z.coerce.number().int().min(1).max(9999),
  nombre: z.string().min(5).max(600),
  descripcion: z.string().max(2000).nullish(),
  formula: z.string().max(500).nullish(),
  sentido: z.enum(["ASC", "DESC"]),
  unidad: z.enum(["PORCENTAJE", "NUMERO", "PUNTAJE", "INDICE"]),
  lineaBase: z.coerce.number().finite().nullable(),
  anioLineaBase: z.coerce.number().int().min(2020).max(2030).nullable(),
  peso: z.coerce.number().positive().max(10).default(1),
  activo: z.coerce.boolean().default(true),
  metas: z
    .array(
      z.object({
        anio: z.number().int().min(2026).max(2030),
        valorMeta: z.coerce.number().finite().nullable(),
      }),
    )
    .length(5),
});
export type IndicadorUpdate = z.infer<typeof IndicadorUpdateSchema>;

/** Umbral de criticidad configurable con herencia. */
export const UmbralUpsertSchema = z
  .object({
    scope: z.enum(["GLOBAL", "OE", "AE", "INDICADOR"]),
    entidad: z.string().min(1).max(20),
    verde: z.coerce.number().int().min(1).max(100),
    amarillo: z.coerce.number().int().min(0).max(99),
  })
  .refine((d) => d.amarillo < d.verde, {
    message: "El umbral amarillo debe ser menor que el verde.",
    path: ["amarillo"],
  });
export type UmbralUpsert = z.infer<typeof UmbralUpsertSchema>;

/** Alta/edición de usuarios (plano de control = base de producción). */
export const UsuarioCreateSchema = z.object({
  nombre: z.string().min(3).max(120),
  email: z.string().email().max(160),
  password: z.string().min(8).max(72),
  roles: z
    .array(
      z.enum([
        "ADMIN",
        "DGPD_VALIDADOR",
        "DEPENDENCIA_CARGA",
        "AUTORIDAD",
        "CONSULTA",
      ]),
    )
    .min(1),
  dependenciaIds: z.array(z.number().int().positive()).default([]),
});
export type UsuarioCreate = z.infer<typeof UsuarioCreateSchema>;

export const UsuarioUpdateSchema = UsuarioCreateSchema.omit({
  password: true,
})
  .extend({
    id: z.number().int().positive(),
    activo: z.boolean(),
    password: z.string().min(8).max(72).optional().or(z.literal("")),
  });
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;
