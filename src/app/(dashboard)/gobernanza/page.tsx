import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { AnioSelector } from "@/ui/components/anio-selector";
import { fmtPct } from "@/lib/utils";
import type { EstadoWF } from "@/domain/types";

export const metadata: Metadata = { title: "Gobernanza" };
export const dynamic = "force-dynamic";

const WF_LABEL: Record<EstadoWF | "SIN_CARGA", { label: string; cls: string }> = {
  SIN_CARGA: { label: "Sin carga", cls: "bg-sem-gris-bg text-muted" },
  BORRADOR: { label: "Borrador", cls: "bg-sem-ambar-bg text-[#8a6412]" },
  ENVIADO: { label: "Enviado", cls: "bg-azul-soft text-azul-d" },
  EN_REVISION: { label: "En revisión", cls: "bg-azul-soft text-azul-d" },
  OBSERVADO: { label: "Observado", cls: "bg-sem-ambar-bg text-[#8a6412]" },
  APROBADO: { label: "Aprobado", cls: "bg-sem-verde-bg text-[#1f6a49]" },
  RECHAZADO: { label: "Rechazado", cls: "bg-sem-rojo-bg text-[#8f2f2f]" },
  RECTIFICADO: { label: "Rectificado", cls: "bg-sem-gris-bg text-muted" },
};

export default async function GobernanzaPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  const reportables = estado.indicadores.filter(
    (i) => i.meta !== null && !i.metaConcluida,
  );

  // Pipeline de workflow (última versión de cada indicador del período)
  const pipeline = new Map<string, number>();
  for (const i of reportables) {
    const k = i.estadoMedicion ?? "SIN_CARGA";
    pipeline.set(k, (pipeline.get(k) ?? 0) + 1);
  }

  // Cobertura por dependencia principal
  const porDep = new Map<string, { esperadas: number; aprobadas: number }>();
  for (const i of reportables) {
    const d = porDep.get(i.dependenciaPrincipal) ?? { esperadas: 0, aprobadas: 0 };
    d.esperadas++;
    if (i.valor !== null) d.aprobadas++;
    porDep.set(i.dependenciaPrincipal, d);
  }
  const depsOrdenadas = [...porDep.entries()].sort(
    (a, b) =>
      a[1].aprobadas / a[1].esperadas - b[1].aprobadas / b[1].esperadas ||
      b[1].esperadas - a[1].esperadas,
  );

  const diagnostico = estado.indicadores.filter((i) => i.requiereDiagnostico);
  const basePendiente = estado.indicadores.filter((i) => i.basePendiente);

  const ordenPipeline: (EstadoWF | "SIN_CARGA")[] = [
    "SIN_CARGA",
    "BORRADOR",
    "ENVIADO",
    "EN_REVISION",
    "OBSERVADO",
    "APROBADO",
    "RECHAZADO",
    "RECTIFICADO",
  ];

  return (
    <section>
      <PageHeader
        title="Gobernanza del dato"
        subtitle={`Cobertura, flujo de validación y calidad · ejercicio ${anio} · ${reportables.length} indicadores reportables`}
        right={<AnioSelector anio={anio} />}
      />

      {/* Pipeline */}
      <Card className="mb-4">
        <CardHeader
          title="Flujo de validación del período"
          meta="última versión de cada indicador reportable"
        />
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {ordenPipeline.map((k) => {
              const n = pipeline.get(k) ?? 0;
              if (n === 0 && k === "RECTIFICADO") return null;
              const w = WF_LABEL[k];
              return (
                <div
                  key={k}
                  className="min-w-[120px] flex-1 rounded-pj border border-linea px-[13px] py-[11px]"
                >
                  <span
                    className={`inline-block rounded-[10px] px-2 py-[2px] text-[10.5px] font-semibold ${w.cls}`}
                  >
                    {w.label}
                  </span>
                  <div className="tnum mt-2 font-serif text-[24px]">{n}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-muted">
            Solo las mediciones <b className="text-[#1f6a49]">Aprobadas</b>{" "}
            alimentan los tableros oficiales. Cobertura del período:{" "}
            <b>{fmtPct(estado.cobertura.fraccion)}</b> (
            {estado.cobertura.aprobadas}/{estado.cobertura.esperadas}).
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 items-start gap-4 max-[1000px]:grid-cols-1">
        {/* Cobertura por dependencia */}
        <Card>
          <CardHeader
            title="Cobertura de reporte por dependencia"
            meta="aprobadas / esperadas · peor cobertura primero"
          />
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                  <th className="border-b border-linea px-4 py-2">
                    Dependencia (principal)
                  </th>
                  <th className="border-b border-linea px-4 py-2 text-right">
                    Aprob./Esper.
                  </th>
                  <th className="border-b border-linea px-4 py-2 text-right">
                    Cobertura
                  </th>
                </tr>
              </thead>
              <tbody>
                {depsOrdenadas.map(([dep, d]) => (
                  <tr key={dep} className="hover:bg-[#F8FAFB]">
                    <td className="border-b border-linea-2 px-4 py-2 text-[12.5px]">
                      {dep}
                    </td>
                    <td className="tnum border-b border-linea-2 px-4 py-2 text-right">
                      {d.aprobadas}/{d.esperadas}
                    </td>
                    <td className="tnum border-b border-linea-2 px-4 py-2 text-right font-semibold">
                      {fmtPct(d.aprobadas / d.esperadas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Calidad del dato */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Requieren diagnóstico o investigación previa"
              meta={`${diagnostico.length} indicadores`}
            />
            <CardBody className="scroll-pj max-h-[300px] overflow-y-auto p-0">
              <table className="w-full">
                <tbody>
                  {diagnostico.map((i) => (
                    <tr key={i.codigo} className="hover:bg-azul-soft">
                      <td className="w-[60px] border-b border-linea-2 px-4 py-2">
                        <Link
                          href={`/indicadores/${i.codigo}?anio=${anio}`}
                          className="font-serif font-semibold text-azul-d hover:underline"
                        >
                          {i.codigo}
                        </Link>
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2 text-[12.5px]">
                        {i.nombre.length > 80 ? `${i.nombre.slice(0, 80)}…` : i.nombre}
                      </td>
                      <td className="w-[54px] border-b border-linea-2 px-4 py-2">
                        <Tag>{i.oeCodigo}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Línea base pendiente"
              meta="cumplimiento en gris hasta determinarla"
            />
            <CardBody className="p-0">
              <table className="w-full">
                <tbody>
                  {basePendiente.map((i) => (
                    <tr key={i.codigo} className="hover:bg-azul-soft">
                      <td className="w-[60px] border-b border-linea-2 px-4 py-2">
                        <Link
                          href={`/indicadores/${i.codigo}?anio=${anio}`}
                          className="font-serif font-semibold text-azul-d hover:underline"
                        >
                          {i.codigo}
                        </Link>
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2 text-[12.5px]">
                        {i.nombre.length > 80 ? `${i.nombre.slice(0, 80)}…` : i.nombre}
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2 text-[11.5px] text-muted">
                        a determinar al cierre de 2025
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
