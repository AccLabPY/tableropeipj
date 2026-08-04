"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { ApiError } from "@/server/api/api-error";
import {
  agregarEvidenciaArchivo,
  eliminarEvidencia,
  enviar,
  guardarBorrador,
  tomarEnRevision,
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

const EVIDENCIA_TAMANIO_MAXIMO = 25 * 1024 * 1024; // 25MB

/** Adjunta un archivo respaldatorio a la medición (dependencia dueña). */
export async function subirEvidenciaAction(
  medicionId: string,
  formData: FormData,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
    const ctx = await getCtx(actor);
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, mensaje: "Seleccione un archivo para adjuntar." };
    }
    if (archivo.size > EVIDENCIA_TAMANIO_MAXIMO) {
      return { ok: false, mensaje: "El archivo supera el límite de 25 MB." };
    }
    const contenido = Buffer.from(await archivo.arrayBuffer());
    await agregarEvidenciaArchivo(ctx, BigInt(medicionId), {
      nombreArchivo: archivo.name,
      mimeType: archivo.type || "application/octet-stream",
      contenido,
    });
    revalidatePath("/registro");
    return { ok: true, mensaje: "Evidencia adjuntada." };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }
}

/** Elimina un adjunto propio (solo mientras la medición es editable). */
export async function eliminarEvidenciaAction(
  evidenciaId: string,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DEPENDENCIA_CARGA", "ADMIN");
    const ctx = await getCtx(actor);
    await eliminarEvidencia(ctx, BigInt(evidenciaId));
    revalidatePath("/registro");
    return { ok: true, mensaje: "Evidencia eliminada." };
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }
}

/** El validador toma la medición ENVIADO → EN_REVISION antes de resolver. */
export async function tomarEnRevisionAction(
  medicionId: string,
): Promise<ResultadoAccion> {
  try {
    const actor = await requireApi("DGPD_VALIDADOR", "ADMIN");
    const ctx = await getCtx(actor);
    await tomarEnRevision(ctx, BigInt(medicionId));
    revalidatePath("/registro");
    return { ok: true, mensaje: "Medición tomada en revisión." };
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
