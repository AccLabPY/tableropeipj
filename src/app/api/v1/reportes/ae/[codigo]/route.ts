import { z } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { excelAE } from "@/server/services/reportes-excel.service";
import { AnioQuery } from "@/shared/schemas/query";
import { errorReporte, respuestaXlsx } from "../../xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/reportes/ae/:codigo?anio= — acción estratégica (.xlsx). */
export async function GET(
  req: Request,
  { params }: { params: { codigo: string } },
) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const codigo = z
      .string()
      .regex(/^A\.E\.[1-6]\.\d{1,2}$/)
      .parse(decodeURIComponent(params.codigo));
    const anio = AnioQuery.parse(new URL(req.url).searchParams.get("anio"));
    const { buffer, nombre } = await excelAE(ctx, codigo, anio);
    return respuestaXlsx(nombre, buffer);
  } catch (e) {
    return errorReporte("ae", e);
  }
}
