import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { AnioSelector } from "@/ui/components/anio-selector";
import { CatalogoIndicadores } from "@/ui/features/indicadores/catalogo";

export const metadata: Metadata = { title: "Indicadores" };
export const dynamic = "force-dynamic";

export default async function IndicadoresPage({
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
        title="Indicadores"
        subtitle="Catálogo de seguimiento · cumplimiento normalizado por sentido y línea base"
        right={<AnioSelector anio={anio} />}
      />
      <CatalogoIndicadores estado={estado} />
    </section>
  );
}
