"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { ApiError } from "@/server/api/api-error";
import {
  enviar,
  guardarBorrador,
  validar,
} from "@/server/services/medicion.service";
import {
  MedicionInputSchema,
  ValidarInputSchema,
} from "@/shared/schemas/medicion";

export interface ResultadoAccion {
  ok: boolean;
  mensaje: string;
}

function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof ZodError)
    return e.errors.map((x) => x.message).join(" · ");
  console.error("[registro] error:", e);
  return "Error inesperado al procesar la operación.";
}

/** Guarda (crea/actualiza) el borrador de la medición. */
export async function guardarBorradorAction(
  input: unknown,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
    const ctx = await getCtx(actor);
    const datos = MedicionInputSchema.parse(input);
    await guardarBorrador(ctx, datos);
    revalidatePath("/registro");
    return {
      ok: true,
      mensaje: "Borrador guardado. Aún no visible en el tablero.",
    };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }
}

/** Guarda el borrador y lo envía a validación de la DGPD. */
export async function enviarMedicionAction(
  input: unknown,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
    const ctx = await getCtx(actor);
    const datos = MedicionInputSchema.parse(input);
    const m = await guardarBorrador(ctx, datos);
    await enviar(ctx, m.id);
    revalidatePath("/registro");
    return { ok: true, mensaje: "Medición enviada a la DGPD para validación." };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }
}

/** Resolución del validador sobre una medición enviada/en revisión. */
export async function validarMedicionAction(
  medicionId: string,
  input: unknown,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DGPD_VALIDADOR", "ADMIN");
    const ctx = await getCtx(actor);
    const datos = ValidarInputSchema.parse(input);
    await validar(ctx, BigInt(medicionId), datos);
    revalidatePath("/registro");
    const texto = {
      APROBADO: "Medición APROBADA: ya alimenta los tableros oficiales.",
      OBSERVADO: "Medición OBSERVADA: vuelve a la dependencia para corrección.",
      RECHAZADO: "Medición RECHAZADA.",
    }[datos.resultado];
    return { ok: true, mensaje: texto };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }
}
