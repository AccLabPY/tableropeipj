import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { listarCompletos } from "@/server/repositories/indicador.repo";
import { num } from "@/server/services/mappers";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import { MatrizView, type MatrizItemDTO } from "@/ui/features/admin/matriz-view";

export const metadata: Metadata = { title: "Matriz PEI" };
export const dynamic = "force-dynamic";

export default async function MatrizPage() {
  const actor = await requirePage("ADMIN", "DGPD_VALIDADOR");
  const ctx = await getCtx(actor);
  const indicadores = await listarCompletos(ctx);
  const inactivos = await ctx.db.indicador.findMany({
    where: { activo: false },
    include: { oe: true, ae: true, metas: true },
  });

  const aDto = (i: (typeof indicadores)[number]): MatrizItemDTO => ({
    codigo: i.codigo,
    nombre: i.nombre,
    descripcion: i.descripcion,
    formula: i.formula,
    oeCodigo: i.oe.codigo,
    aeCodigo: i.ae?.codigo ?? null,
    sentido: i.sentido,
    unidad: i.unidad,
    lineaBase: num(i.lineaBase),
    anioLineaBase: i.anioLineaBase,
    peso: num(i.peso) ?? 1,
    activo: i.activo,
    metas: i.metas
      .sort((a, b) => a.anio - b.anio)
      .map((m) => ({ anio: m.anio, valorMeta: num(m.valorMeta) })),
  });

  const items = [
    ...indicadores.map(aDto),
    ...inactivos.map((i) =>
      aDto({ ...i, escala: [], responsables: [] } as never),
    ),
  ].sort((a, b) => a.codigo - b.codigo);

  return (
    <section>
      <BackButton />
      <div className="mt-3">
        <PageHeader
          title="Matriz PEI"
          subtitle="Administración de indicadores, líneas base y metas · los cambios recalculan el tablero"
        />
      </div>
      <MatrizView items={items} />
    </section>
  );
}
