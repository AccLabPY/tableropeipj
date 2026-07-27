import { manejar, ok } from "@/server/api/envelope";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { IndicadoresQuery } from "@/shared/schemas/query";

export const dynamic = "force-dynamic";

/** GET /api/v1/indicadores?anio&oe&estado&q&page&pageSize — catálogo filtrable. */
export const GET = manejar(async (req) => {
  const actor = await requireApi();
  const ctx = await getCtx(actor);
  const sp = new URL(req.url).searchParams;
  const q = IndicadoresQuery.parse(Object.fromEntries(sp.entries()));

  const estado = await estadoPEI(ctx, q.anio);
  let filas = estado.indicadores;
  if (q.oe) filas = filas.filter((i) => i.oeCodigo === q.oe);
  if (q.estado) filas = filas.filter((i) => i.semaforo === q.estado);
  if (q.q) {
    const term = q.q.toLowerCase();
    filas = filas.filter(
      (i) =>
        String(i.codigo).includes(term) ||
        i.nombre.toLowerCase().includes(term),
    );
  }
  const total = filas.length;
  const inicio = (q.page - 1) * q.pageSize;
  return ok(filas.slice(inicio, inicio + q.pageSize), {
    anio: q.anio,
    page: q.page,
    pageSize: q.pageSize,
    total,
  });
});
