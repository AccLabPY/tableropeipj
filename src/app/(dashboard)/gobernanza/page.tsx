import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { slaPorDependencia } from "@/server/services/sla.service";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { AnioSelector } from "@/ui/components/anio-selector";
import { LinkExportar } from "@/ui/features/reportes/link-exportar";
import { fmtPct } from "@/lib/utils";
import type { EstadoWF } from "@/domain/types";
import { WF_CHIP } from "@/ui/features/shared/chip-workflow";
import {
  CoberturaDependencias,
  type FilaDependencia,
} from "@/ui/features/gobernanza/cobertura-dependencias";

export const metadata: Metadata = { title: "Gobernanza" };
export const dynamic = "force-dynamic";

export default async function GobernanzaPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const [estado, sla] = await Promise.all([
    estadoPEI(ctx, anio),
    slaPorDependencia(ctx, anio),
  ]);

  const reportables = estado.indicadores.filter(
    (i) => i.meta !== null && !i.metaConcluida,
  );

  // Pipeline de workflow (última versión de cada indicador del período)
  const pipeline = new Map<string, number>();
  for (const i of reportables) {
    const k = i.estadoMedicion ?? "SIN_CARGA";
    pipeline.set(k, (pipeline.get(k) ?? 0) + 1);
  }

  // Cobertura por dependencia principal + sus indicadores (drill-down)
  const porDep = new Map<string, FilaDependencia>();
  for (const i of reportables) {
    const d =
      porDep.get(i.dependenciaPrincipal) ??
      ({
        dependencia: i.dependenciaPrincipal,
        dependenciaId: i.dependenciaPrincipalId,
        esperadas: 0,
        aprobadas: 0,
        indicadores: [],
      } satisfies FilaDependencia);
    d.esperadas++;
    if (i.valor !== null) d.aprobadas++;
    d.indicadores.push({
      codigo: i.codigo,
      nombre: i.nombre,
      estadoMedicion: i.estadoMedicion,
      semaforo: i.semaforo,
      capado: i.capado,
    });
    porDep.set(i.dependenciaPrincipal, d);
  }
  const depsOrdenadas = [...porDep.values()].sort(
    (a, b) =>
      a.aprobadas / a.esperadas - b.aprobadas / b.esperadas ||
      b.esperadas - a.esperadas,
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
        right={
          <>
            <LinkExportar href={`/reportes/gobernanza?anio=${anio}`} />
            <AnioSelector anio={anio} />
          </>
        }
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
              const w = WF_CHIP[k];
              return (
                <div
                  key={k}
                  className="min-w-[100px] flex-1 rounded-pj border border-linea px-[13px] py-[11px] xs:min-w-[120px]"
                >
                  <span
                    className={`inline-block rounded-chip px-2 py-[2px] text-[10.5px] font-semibold ${w.cls}`}
                  >
                    {w.label}
                  </span>
                  <div className="tnum mt-2 font-serif text-seccion">{n}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11.5px] text-muted">
            Solo las mediciones <b className="text-sem-verde-fg">Aprobadas</b>{" "}
            alimentan los tableros oficiales. Cobertura del período:{" "}
            <b>{fmtPct(estado.cobertura.fraccion)}</b> (
            {estado.cobertura.aprobadas}/{estado.cobertura.esperadas}).
          </p>
        </CardBody>
      </Card>

      {/* SLA de carga: puntualidad de las dependencias frente al plazo */}
      <Card className="mb-4">
        <CardHeader
          title="SLA de carga por dependencia"
          meta={`${sla.reduce((n, s) => n + s.envios, 0)} envíos registrados`}
        />
        <CardBody className="p-0">
          {sla.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12.5px] text-muted">
              Todavía no hay envíos registrados para medir la puntualidad del
              ejercicio {anio}.
            </p>
          ) : (
            <DataTable
              celdaClassName="px-4 py-2"
              columnas={[
                {
                  key: "dependencia",
                  header: "Dependencia",
                  movil: "titulo",
                  cell: (f) => f.dependencia,
                },
                {
                  key: "envios",
                  header: "Envíos",
                  align: "right",
                  tnum: true,
                  cell: (f) => f.envios,
                },
                {
                  key: "puntualidad",
                  header: "En plazo",
                  align: "right",
                  tnum: true,
                  movil: "insignia",
                  cell: (f) => (
                    <span
                      className={
                        f.puntualidad === null
                          ? "text-muted"
                          : f.puntualidad >= 0.9
                            ? "font-semibold text-sem-verde-fg"
                            : f.puntualidad >= 0.7
                              ? "font-semibold text-sem-ambar-fg"
                              : "font-semibold text-sem-rojo-fg"
                      }
                    >
                      {f.puntualidad === null ? "—" : fmtPct(f.puntualidad)}
                    </span>
                  ),
                },
                {
                  key: "fuera",
                  header: "Fuera de plazo",
                  align: "right",
                  tnum: true,
                  cell: (f) => f.fueraDePlazo,
                },
                {
                  key: "atraso",
                  header: "Atraso prom.",
                  align: "right",
                  tnum: true,
                  tdClassName: "text-[12px] text-muted",
                  cell: (f) =>
                    f.atrasoPromedio === null ? "—" : `${f.atrasoPromedio} d`,
                },
                {
                  key: "prorroga",
                  header: "Con prórroga",
                  align: "right",
                  tnum: true,
                  tdClassName: "text-[12px] text-muted",
                  cell: (f) => f.conProrroga,
                },
              ]}
              filas={sla}
              keyFila={(f) => f.dependenciaId}
              vacio="Sin envíos registrados."
            />
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {/* Cobertura por dependencia (con drill-down a sus indicadores) */}
        <Card>
          <CardHeader
            title="Cobertura de reporte por dependencia"
            meta="toque una dependencia para ver sus indicadores"
          />
          <CardBody className="p-0">
            <CoberturaDependencias filas={depsOrdenadas} anio={anio} />
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
