import { z } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { excelDependencia } from "@/server/services/reportes-excel.service";
import { AnioQuery } from "@/shared/schemas/query";
import { errorReporte, respuestaXlsx } from "../../xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/reportes/dependencia/:id?anio= — indicadores a cargo (.xlsx). */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const id = z.coerce.number().int().positive().parse(params.id);
    const anio = AnioQuery.parse(new URL(req.url).searchParams.get("anio"));
    const { buffer, nombre } = await excelDependencia(ctx, id, anio);
    return respuestaXlsx(nombre, buffer);
  } catch (e) {
    return errorReporte("dependencia", e);
  }
}
