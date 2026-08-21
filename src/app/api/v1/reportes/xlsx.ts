import { z } from "zod";
import { ApiError } from "@/server/api/api-error";

/** Respuesta de descarga .xlsx con headers estándar. */
export function respuestaXlsx(nombre: string, buffer: Buffer): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Manejo de errores común de los endpoints de reportes. */
export function errorReporte(etiqueta: string, e: unknown): Response {
  if (e instanceof ApiError) return new Response(e.message, { status: e.status });
  if (e instanceof z.ZodError)
    return new Response("Parámetros inválidos.", { status: 400 });
  console.error(`[reportes/${etiqueta}] error:`, e);
  return new Response("Error inesperado.", { status: 500 });
}
