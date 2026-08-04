import { z } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { scopeMediciones } from "@/server/repositories/medicion.repo";
import { ApiError } from "@/server/api/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Bytes/Buffer no soportado en edge

const IdParam = z.coerce.bigint();

/**
 * GET /api/v1/evidencias/:id — descarga el binario de una evidencia.
 * Scoped: DEPENDENCIA_CARGA solo descarga evidencia de sus propias
 * mediciones (mismo scopeMediciones que el resto de la plataforma).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const id = IdParam.parse(params.id);

    const ev = await ctx.db.evidencia.findFirst({
      where: { id, medicion: scopeMediciones(ctx.actor) },
      select: { nombreArchivo: true, mimeType: true, contenido: true },
    });
    if (!ev || !ev.contenido) {
      return new Response("Evidencia no encontrada.", { status: 404 });
    }

    return new Response(new Uint8Array(ev.contenido), {
      headers: {
        "Content-Type": ev.mimeType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(ev.nombreArchivo)}"`,
        "Content-Length": String(ev.contenido.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) {
      return new Response(e.message, { status: e.status });
    }
    if (e instanceof z.ZodError) {
      return new Response("Identificador inválido.", { status: 400 });
    }
    console.error("[evidencias/descarga] error:", e);
    return new Response("Error inesperado.", { status: 500 });
  }
}
