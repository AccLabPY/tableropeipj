import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { worklistRegistro } from "@/server/services/registro.service";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { AnioSelector } from "@/ui/components/anio-selector";
import { RegistroView } from "@/ui/features/registro/registro-view";

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
  const data = await worklistRegistro(ctx, anio);
  const pre = Number(searchParams.indicador);
  const indicadorInicial = Number.isInteger(pre) && pre > 0 ? pre : null;

  return (
    <section>
      <PageHeader
        title="Carga de avances"
        subtitle="Registro de mediciones por dependencia · flujo Borrador → Enviado → Validado · solo las mediciones validadas alimentan el tablero"
        right={<AnioSelector anio={anio} />}
      />
      <RegistroView data={data} indicadorInicial={indicadorInicial} />
    </section>
  );
}
