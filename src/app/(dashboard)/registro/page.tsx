import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { worklistRegistro } from "@/server/services/registro.service";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { AnioSelector } from "@/ui/components/anio-selector";
import { RegistroTabla } from "@/ui/features/registro/registro-tabla";

export const metadata: Metadata = { title: "Carga de avances" };
export const dynamic = "force-dynamic";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: { anio?: string; indicador?: string };
}) {
  const actor = await requirePage("DEPENDENCIA_CARGA", "DGPD_VALIDADOR", "ADMIN");
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);

  // Enlaces antiguos (?indicador=) van directo a la pantalla del indicador.
  const pre = Number(searchParams.indicador);
  if (Number.isInteger(pre) && pre > 0) {
    redirect(`/registro/indicador/${pre}?anio=${anio}`);
  }

  const data = await worklistRegistro(ctx, anio);

  return (
    <section>
      <PageHeader
        title="Carga de avances"
        subtitle="Sus indicadores del período · abra uno para reportar su avance · solo las mediciones validadas alimentan el tablero"
        right={<AnioSelector anio={anio} />}
      />
      <RegistroTabla data={data} />
    </section>
  );
}
