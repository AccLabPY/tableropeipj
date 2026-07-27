import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { fichaIndicador } from "@/server/services/indicador-ficha.service";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";

export const dynamic = "force-dynamic";

/** GET /api/v1/indicadores/:codigo?anio — ficha completa + trayectoria. */
export const GET = manejar<{ params: { codigo: string } }>(
  async (req, { params }) => {
    const actor = await requireApi();
    const ctx = await getCtx(actor);
    const codigo = CodigoParam.parse(params.codigo);
    const anio = AnioQuery.parse(
      new URL(req.url).searchParams.get("anio") ?? undefined,
    );
    const data = await fichaIndicador(ctx, codigo, anio);
    return ok(data);
  },
);
