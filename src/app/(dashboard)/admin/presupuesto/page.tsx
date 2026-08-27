import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import { AnioSelector } from "@/ui/components/anio-selector";
import { PresupuestoView } from "@/ui/features/admin/presupuesto-view";

export const metadata: Metadata = { title: "Ejecución presupuestaria" };
export const dynamic = "force-dynamic";

export default async function AdminPresupuestoPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage("ADMIN");
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const fila = await ctx.db.presupuestoEjercicio.findUnique({ where: { anio } });

  return (
    <section>
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Ejecución presupuestaria"
        subtitle="Presupuesto asignado y ejecutado del ejercicio, publicado en el Reporte ejecutivo"
        right={<AnioSelector anio={anio} />}
      />
      <PresupuestoView
        anio={anio}
        asignado={fila ? Number(fila.asignado) : null}
        ejecutado={fila ? Number(fila.ejecutado) : null}
      />
    </section>
  );
}
