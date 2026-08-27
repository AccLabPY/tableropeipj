import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import { Callout } from "@/ui/features/documentacion/callout";
import { EstructuraView } from "@/ui/features/admin/estructura-view";

export const metadata: Metadata = { title: "Estructura del PEI" };
export const dynamic = "force-dynamic";

export default async function AdminEstructuraPage() {
  const actor = await requirePage("ADMIN");
  const ctx = await getCtx(actor);

  const [oes, aes, indicadores, dependencias] = await Promise.all([
    ctx.db.objetivoEstrategico.findMany({
      orderBy: { codigo: "asc" },
      include: { _count: { select: { acciones: true, indicadores: true } } },
    }),
    ctx.db.accionEstrategica.findMany({
      orderBy: { codigo: "asc" },
      include: { oe: { select: { codigo: true } }, _count: { select: { indicadores: true } } },
    }),
    ctx.db.indicador.findMany({
      orderBy: { codigo: "asc" },
      include: {
        oe: { select: { codigo: true } },
        ae: { select: { codigo: true } },
        _count: { select: { mediciones: true } },
      },
    }),
    ctx.db.dependencia.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);

  return (
    <section>
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Estructura del PEI"
        subtitle="Alta y baja de objetivos estratégicos, acciones e indicadores de la matriz"
      />
      <div className="mb-4">
        <Callout tipo="advertencia">
          Cambiar la estructura afecta a todos los tableros y reportes. Un
          indicador con mediciones registradas no se elimina: se desactiva para
          conservar la trazabilidad del histórico. Los atributos y metas de un
          indicador existente se editan en <b>Matriz PEI</b>.
        </Callout>
      </div>
      <EstructuraView
        oes={oes.map((o) => ({
          codigo: o.codigo,
          nombre: o.nombre,
          acciones: o._count.acciones,
          indicadores: o._count.indicadores,
        }))}
        aes={aes.map((a) => ({
          codigo: a.codigo,
          nombre: a.nombre,
          oeCodigo: a.oe.codigo,
          indicadores: a._count.indicadores,
        }))}
        indicadores={indicadores.map((i) => ({
          codigo: i.codigo,
          nombre: i.nombre,
          oeCodigo: i.oe.codigo,
          aeCodigo: i.ae?.codigo ?? null,
          activo: i.activo,
          mediciones: i._count.mediciones,
        }))}
        dependencias={dependencias}
      />
    </section>
  );
}
