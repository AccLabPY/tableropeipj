import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { listarUmbrales } from "@/server/repositories/umbral.repo";
import { PageHeader } from "@/ui/components/page-header";
import { EscalasView } from "@/ui/features/admin/escalas-view";
import { BackButton } from "@/ui/components/back-button";

export const metadata: Metadata = { title: "Escalas de criticidad" };
export const dynamic = "force-dynamic";

export default async function EscalasPage() {
  const actor = await requirePage("ADMIN", "DGPD_VALIDADOR");
  const ctx = await getCtx(actor);

  const [umbrales, oes, aes, indicadores] = await Promise.all([
    listarUmbrales(ctx),
    ctx.db.objetivoEstrategico.findMany({ orderBy: { codigo: "asc" } }),
    ctx.db.accionEstrategica.findMany({
      include: { oe: true },
      orderBy: { codigo: "asc" },
    }),
    ctx.db.indicador.findMany({
      include: { oe: true, ae: true },
      orderBy: { codigo: "asc" },
    }),
  ]);

  return (
    <section>
      <BackButton />
      <div className="mt-3">
        <PageHeader
          title="Escalas de criticidad"
          subtitle="Umbrales del semáforo configurables por Global / Objetivo / Acción / Indicador — lo específico prevalece"
        />
      </div>
      <EscalasView
        umbrales={umbrales}
        catalogos={{
          oes: oes.map((o) => ({ codigo: o.codigo, nombre: o.nombre })),
          aes: aes.map((a) => ({
            codigo: a.codigo,
            nombre: a.nombre,
            oeCodigo: a.oe.codigo,
          })),
          indicadores: indicadores.map((i) => ({
            codigo: i.codigo,
            nombre: i.nombre,
            aeCodigo: i.ae?.codigo ?? null,
            oeCodigo: i.oe.codigo,
          })),
        }}
      />
    </section>
  );
}
