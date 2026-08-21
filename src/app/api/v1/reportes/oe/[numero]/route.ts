import { z } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { excelOE } from "@/server/services/reportes-excel.service";
import { AnioQuery } from "@/shared/schemas/query";
import { errorReporte, respuestaXlsx } from "../../xlsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/reportes/oe/:numero?anio= — objetivo estratégico (.xlsx). */
export async function GET(
  req: Request,
  { params }: { params: { numero: string } },
) {
  try {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const numero = z.coerce.number().int().min(1).max(6).parse(params.numero);
    const anio = AnioQuery.parse(new URL(req.url).searchParams.get("anio"));
    const { buffer, nombre } = await excelOE(ctx, numero, anio);
    return respuestaXlsx(nombre, buffer);
  } catch (e) {
    return errorReporte("oe", e);
  }
}
