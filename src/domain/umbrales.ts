import type { Umbral } from "./types";

/** Umbral global por defecto (parametrizable vía UmbralCriticidad GLOBAL). */
export const UMBRAL_GLOBAL_DEFAULT: Umbral = { verde: 0.9, amarillo: 0.7 };

/**
 * Resolución con herencia: lo específico prevalece.
 * Indicador → AE → OE → Global.
 */
export function umbralEfectivo(o: {
  INDICADOR?: Umbral;
  AE?: Umbral;
  OE?: Umbral;
  GLOBAL: Umbral;
}): Umbral {
  return o.INDICADOR ?? o.AE ?? o.OE ?? o.GLOBAL;
}

/** Convierte un registro de UmbralCriticidad (valores en %) a fracciones 0..1. */
export function pctAUmbral(u: {
  verde: number;
  amarillo: number;
  azul?: number | null;
}): Umbral {
  return {
    verde: u.verde / 100,
    amarillo: u.amarillo / 100,
    azul: u.azul == null ? null : u.azul / 100,
  };
}

/** Registro de umbrales cargado desde DB, indexado por clave "SCOPE:entidad". */
export type RegistroUmbrales = ReadonlyMap<string, Umbral>;

export const claveUmbral = (
  scope: "GLOBAL" | "OE" | "AE" | "INDICADOR",
  entidad: string,
): string => `${scope}:${entidad}`;

/**
 * Resuelve el umbral efectivo de un indicador contra el registro completo.
 * `ctx` identifica al indicador y su cadena de pertenencia.
 */
export function resolverUmbral(
  registro: RegistroUmbrales,
  ctx: { indicadorCodigo: number; aeCodigo?: string | null; oeCodigo: string },
): Umbral {
  return umbralEfectivo({
    INDICADOR: registro.get(
      claveUmbral("INDICADOR", String(ctx.indicadorCodigo)),
    ),
    AE: ctx.aeCodigo
      ? registro.get(claveUmbral("AE", ctx.aeCodigo))
      : undefined,
    OE: registro.get(claveUmbral("OE", ctx.oeCodigo)),
    GLOBAL:
      registro.get(claveUmbral("GLOBAL", "GLOBAL")) ?? UMBRAL_GLOBAL_DEFAULT,
  });
}

/**
 * Describe de dónde hereda el umbral efectivo (para la UI de configuración).
 */
export function origenUmbral(
  registro: RegistroUmbrales,
  ctx: { indicadorCodigo: number; aeCodigo?: string | null; oeCodigo: string },
): "INDICADOR" | "AE" | "OE" | "GLOBAL" {
  if (registro.has(claveUmbral("INDICADOR", String(ctx.indicadorCodigo))))
    return "INDICADOR";
  if (ctx.aeCodigo && registro.has(claveUmbral("AE", ctx.aeCodigo)))
    return "AE";
  if (registro.has(claveUmbral("OE", ctx.oeCodigo))) return "OE";
  return "GLOBAL";
}
