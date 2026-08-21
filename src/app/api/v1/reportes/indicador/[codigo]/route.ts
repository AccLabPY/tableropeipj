import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { excelIndicador } from "@/server/services/reportes-excel.service";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";
import { errorReporte, respuestaXlsx } from "../../xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/reportes/indicador/:codigo?anio= — ficha + mediciones (.xlsx). */
export async function GET(
  req: Request,
  { params }: { params: { codigo: string } },
) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const codigo = CodigoParam.parse(params.codigo);
    const anio = AnioQuery.parse(new URL(req.url).searchParams.get("anio"));
    const { buffer, nombre } = await excelIndicador(ctx, codigo, anio);
    return respuestaXlsx(nombre, buffer);
  } catch (e) {
    return errorReporte("indicador", e);
  }
}
