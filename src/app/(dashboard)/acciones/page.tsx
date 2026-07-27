import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { AnioSelector } from "@/ui/components/anio-selector";
import { AccionesView } from "@/ui/features/acciones/acciones-view";

export const metadata: Metadata = { title: "Acciones estratégicas" };
export const dynamic = "force-dynamic";

export default async function AccionesPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  return (
    <section>
      <PageHeader
        title="Acciones estratégicas"
        subtitle="Capa intermedia OE → Acción → Indicador · mirada por acción y su conjunto de indicadores"
        right={<AnioSelector anio={anio} />}
      />
      <AccionesView estado={estado} />
    </section>
  );
}
