import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { excelCatalogo } from "@/server/services/reportes-excel.service";
import { AnioQuery } from "@/shared/schemas/query";
import { ApiError } from "@/server/api/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/reportes/catalogo?anio= — catálogo con avances (.xlsx). */
export async function GET(req: Request) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const anio = AnioQuery.parse(new URL(req.url).searchParams.get("anio"));
    const buffer = await excelCatalogo(ctx, anio);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="catalogo-pei-${anio}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return new Response(e.message, { status: e.status });
    if (e instanceof z.ZodError)
      return new Response("Parámetros inválidos.", { status: 400 });
    console.error("[reportes/catalogo] error:", e);
    return new Response("Error inesperado.", { status: 500 });
  }
}
