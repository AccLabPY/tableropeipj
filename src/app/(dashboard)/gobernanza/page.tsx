import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
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
                  className="min-w-[100px] flex-1 rounded-pj border border-linea px-[13px] py-[11px] xs:min-w-[120px]"
                >
                  <span
                    className={`inline-block rounded-[10px] px-2 py-[2px] text-[10.5px] font-semibold ${w.cls}`}
                  >
                    {w.label}
                  </span>
                  <div className="tnum mt-2 font-serif text-seccion">{n}</div>
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

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {/* Cobertura por dependencia */}
        <Card>
          <CardHeader
            title="Cobertura de reporte por dependencia"
            meta="aprobadas / esperadas · peor cobertura primero"
          />
          <CardBody className="p-0">
            <DataTable
              celdaClassName="px-4 py-2"
              columnas={[
                {
                  key: "dep",
                  header: "Dependencia (principal)",
                  movil: "titulo",
                  tdClassName: "text-[12.5px]",
                  cell: ([dep]) => dep,
                },
                {
                  key: "razon",
                  header: "Aprob./Esper.",
                  align: "right",
                  tnum: true,
                  cell: ([, d]) => `${d.aprobadas}/${d.esperadas}`,
                },
                {
                  key: "cobertura",
                  header: "Cobertura",
                  align: "right",
                  tnum: true,
                  movil: "insignia",
                  tdClassName: "font-semibold",
                  cell: ([, d]) => (
                    <span className="tnum font-semibold">
                      {fmtPct(d.aprobadas / d.esperadas)}
                    </span>
                  ),
                },
              ]}
              filas={depsOrdenadas}
              keyFila={([dep]) => dep}
              vacio="Sin dependencias con indicadores reportables."
            />
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
              <DataTable
                sinCabecera
                celdaClassName="px-4 py-2"
                columnas={[
                  {
                    key: "codigo",
                    header: "Código",
                    movil: "clave",
                    thClassName: "w-[60px]",
                    cell: (i) => (
                      <Link
                        href={`/indicadores/${i.codigo}?anio=${anio}`}
                        className="font-serif font-semibold text-azul-d hover:underline"
                      >
                        {i.codigo}
                      </Link>
                    ),
                  },
                  {
                    key: "nombre",
                    header: "Indicador",
                    movil: "titulo",
                    tdClassName: "text-[12.5px]",
                    cell: (i) =>
                      i.nombre.length > 80
                        ? `${i.nombre.slice(0, 80)}…`
                        : i.nombre,
                  },
                  {
                    key: "oe",
                    header: "OE",
                    movil: "insignia",
                    thClassName: "w-[54px]",
                    cell: (i) => <Tag>{i.oeCodigo}</Tag>,
                  },
                ]}
                filas={diagnostico}
                keyFila={(i) => i.codigo}
                vacio="Ningún indicador requiere diagnóstico previo."
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Línea base pendiente"
              meta="cumplimiento en gris hasta determinarla"
            />
            <CardBody className="p-0">
              <DataTable
                sinCabecera
                celdaClassName="px-4 py-2"
                columnas={[
                  {
                    key: "codigo",
                    header: "Código",
                    movil: "clave",
                    thClassName: "w-[60px]",
                    cell: (i) => (
                      <Link
                        href={`/indicadores/${i.codigo}?anio=${anio}`}
                        className="font-serif font-semibold text-azul-d hover:underline"
                      >
                        {i.codigo}
                      </Link>
                    ),
                  },
                  {
                    key: "nombre",
                    header: "Indicador",
                    movil: "titulo",
                    tdClassName: "text-[12.5px]",
                    cell: (i) =>
                      i.nombre.length > 80
                        ? `${i.nombre.slice(0, 80)}…`
                        : i.nombre,
                  },
                  {
                    key: "nota",
                    header: "Estado",
                    movil: "subtitulo",
                    tdClassName: "text-[11.5px] text-muted",
                    cell: () => "a determinar al cierre de 2025",
                  },
                ]}
                filas={basePendiente}
                keyFila={(i) => i.codigo}
                vacio="Todos los indicadores tienen línea base determinada."
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}
