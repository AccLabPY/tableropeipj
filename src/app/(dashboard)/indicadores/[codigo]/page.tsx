import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardEdit, FileSpreadsheet } from "lucide-react";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { fichaIndicador } from "@/server/services/indicador-ficha.service";
import { ApiError } from "@/server/api/api-error";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { SemPill } from "@/ui/components/sem-pill";
import { BackButton } from "@/ui/components/back-button";
import { LinkExportar } from "@/ui/features/reportes/link-exportar";
import { BarraAcciones } from "@/ui/components/barra-acciones";
import { LazySerieIndicador } from "@/ui/charts/lazy";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtFechaCorta, fmtNum, fmtPct, fmtValor } from "@/lib/utils";
import type { IndicadorFichaDTO } from "@/shared/dtos/indicador-ficha";

export const metadata: Metadata = { title: "Detalle de indicador" };
export const dynamic = "force-dynamic";

const ESTADO_WF_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  EN_REVISION: "En revisión",
  OBSERVADO: "Observado",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  RECTIFICADO: "Rectificado",
};

export default async function DetalleIndicadorPage({
  params,
  searchParams,
}: {
  params: { codigo: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const parseCodigo = CodigoParam.safeParse(params.codigo);
  if (!parseCodigo.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);

  let ficha: IndicadorFichaDTO;
  try {
    ficha = await fichaIndicador(ctx, parseCodigo.data, anio);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const est = ficha.estado;
  const puedeCargar = actor.roles.some((r) =>
    ["DEPENDENCIA_CARGA", "DGPD_VALIDADOR", "ADMIN"].includes(r),
  );
  const unidadSufijo = est.unidad === "PORCENTAJE" ? "%" : "";
  const brecha =
    est.valor === null || est.meta === null || est.basePendiente
      ? null
      : est.sentido === "ASC"
        ? est.meta - est.valor
        : est.valor - est.meta;

  return (
    <section>
      {/* Acciones: volver a la izquierda; exportaciones secundarias y la
          acción primaria (Reportar avance) a la derecha, en una sola línea. */}
      <div className="flex items-center justify-between gap-3">
        <BackButton />
        <BarraAcciones>
          <LinkExportar
            href={`/reportes/indicador/${est.codigo}?anio=${anio}`}
            titulo="Abrir la ficha imprimible del indicador"
          />
          <a
            href={`/api/v1/reportes/indicador/${est.codigo}?anio=${anio}`}
            title="Descargar la ficha en Excel"
            className="tap inline-flex h-[34px] flex-none items-center gap-[6px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-3 text-[12px] font-semibold text-tinta hover:border-azul-line hover:bg-hover agentes:rounded-chip"
          >
            <FileSpreadsheet className="h-[15px] w-[15px] text-sem-verde-fg" />
            Excel
          </a>
          {puedeCargar ? (
            <Link
              href={`/registro/indicador/${est.codigo}?anio=${anio}`}
              className="tap inline-flex h-[34px] flex-none items-center gap-[6px] whitespace-nowrap rounded-pj border border-azul-d bg-azul px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-azul-d agentes:rounded-chip agentes:border-transparent agentes:bg-accion agentes:hover:brightness-105"
            >
              <ClipboardEdit className="h-[15px] w-[15px]" />
              Reportar
            </Link>
          ) : null}
        </BarraAcciones>
      </div>
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[420px]">
          {/* Jerarquía OE › AE */}
          <div className="flex flex-wrap items-center gap-[7px]">
            <span className="rounded-pj-sm bg-navy px-2 py-[3px] text-2xs font-semibold uppercase tracking-[.06em] text-white">
              {est.oeCodigo}
            </span>
            {est.aeCodigo ? (
              <>
                <span className="text-[12px] leading-none text-muted-2">›</span>
                <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                  {est.aeCodigo}
                </span>
              </>
            ) : (
              <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                Indicador de objetivo
              </span>
            )}
            {est.dimension ? (
              <span className="rounded-pj-sm border border-linea bg-sem-gris-bg px-2 py-[3px] text-2xs text-muted">
                {est.dimension}
              </span>
            ) : null}
          </div>

          <h1 className="mt-[10px] font-serif text-titulo leading-tight">
            <span className="text-azul-d">{est.codigo}</span> · {est.nombre}
          </h1>

          {/* Contexto estructurado */}
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-[10px] border-l-2 border-azul-line pl-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {est.aeCodigo && ficha.aeNombre ? (
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                  Acción estratégica
                </div>
                <div className="mt-[3px] max-w-2xl text-[12.5px] leading-relaxed text-muted">
                  {ficha.aeNombre}
                </div>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                  Objetivo estratégico
                </div>
                <div className="mt-[3px] max-w-2xl text-[12.5px] leading-relaxed text-muted">
                  {ficha.oeNombre}
                </div>
              </div>
            )}
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                Dependencia responsable
              </div>
              <div className="mt-[3px] text-[12.5px] leading-relaxed text-tinta">
                {est.dependenciaPrincipal}
                {(() => {
                  const n = ficha.responsables.filter(
                    (r) => r.rol === "CORRESPONSABLE",
                  ).length;
                  return n > 0 ? (
                    <span className="text-muted">
                      {" "}
                      +{n} corresponsable{n > 1 ? "s" : ""}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-none text-left sm:text-right">
          <div className="text-[10px] uppercase tracking-[.06em] text-muted">
            Cumplimiento {anio}
          </div>
          <div
            className="font-serif text-kpi"
            style={{ color: SEM_COLORS[est.semaforo] }}
          >
            {fmtPct(est.capado)}
          </div>
          <div className="mt-[6px]">
            <SemPill sem={est.semaforo} />
          </div>
        </div>
      </div>
      <div className="mb-4 h-px bg-linea" />

      {/* Stat row */}
      <div className="mb-4 grid grid-cols-1 gap-[10px] xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <Stat
          label="Línea base"
          valor={
            est.basePendiente
              ? "a determinar"
              : `${fmtNum(est.lineaBase)}${unidadSufijo}`
          }
        />
        <Stat
          label={`Meta ${anio}`}
          valor={
            est.metaConcluida
              ? "concluido"
              : `${fmtNum(est.meta)}${unidadSufijo}`
          }
        />
        <Stat
          label={`Aprobado ${anio}`}
          valor={est.valor === null ? "—" : `${fmtNum(est.valor)}${unidadSufijo}`}
        />
        <Stat
          label="Brecha a meta"
          valor={
            brecha === null
              ? "—"
              : brecha <= 0
                ? "cumplida"
                : `${fmtNum(brecha)}${unidadSufijo}`
          }
        />
        <Stat
          label="Meta 2030"
          valor={(() => {
            const t30 = ficha.trayectoria.find((t) => t.anio === 2030);
            return t30?.metaConcluida
              ? "concluido"
              : `${fmtNum(t30?.meta ?? null)}${unidadSufijo}`;
          })()}
        />
      </div>

      {/* Simetría modular: ambas tarjetas comparten la altura de la fila;
          la gráfica se estira para llenar la suya. */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="flex flex-col">
          <CardHeader
            title="Avance en el tiempo"
            meta="línea base y metas 2026–2030 vs. aprobado"
          />
          <CardBody className="flex flex-1 flex-col">
            {est.basePendiente ? (
              <p className="mb-3 rounded-pj-sm border border-sem-ambar-border bg-sem-ambar-bg px-3 py-2 text-[12px] text-sem-ambar">
                Línea base pendiente ({ficha.comentarios ?? "a determinar al cierre de 2025"}):
                el cumplimiento no se computa hasta definirla.
              </p>
            ) : null}
            <div className="min-h-[220px] flex-1 sm:min-h-[280px]">
              <LazySerieIndicador
                trayectoria={ficha.trayectoria}
                lineaBase={est.lineaBase}
                unidad={est.unidad}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Ficha del indicador" />
          <CardBody className="p-0">
            <dl className="grid grid-cols-1 gap-px bg-linea sm:grid-cols-2">
              <Ficha label="Objetivo estratégico" valor={`${est.oeCodigo} · ${ficha.oeNombre}`} ancho />
              {est.aeCodigo ? (
                <Ficha label="Acción estratégica" valor={`${est.aeCodigo} · ${ficha.aeNombre ?? ""}`} ancho />
              ) : null}
              <Ficha
                label="Unidad"
                valor={
                  est.unidad === "PORCENTAJE"
                    ? "Porcentaje"
                    : est.unidad.charAt(0) + est.unidad.slice(1).toLowerCase()
                }
              />
              <Ficha
                label="Sentido"
                valor={est.sentido === "ASC" ? "Ascendente ↑" : "Descendente ↓"}
              />
              <Ficha label="Dimensión" valor={est.dimension ?? "—"} />
              <Ficha label="Frecuencia" valor={ficha.frecuencia === "ANUAL" ? "Anual" : ficha.frecuencia} />
              <Ficha label="Cobertura" valor={ficha.cobertura} />
              <Ficha
                label="Umbral efectivo"
                valor={`≥${Math.round(est.umbralVerde * 100)}% / ≥${Math.round(est.umbralAmarillo * 100)}% (${est.umbralOrigen.toLowerCase()})`}
              />
              {ficha.descripcion ? (
                <Ficha label="Descripción" valor={ficha.descripcion} ancho />
              ) : null}
              {ficha.variablesDef.length > 0 ? (
                <Ficha
                  label="Variables de la fórmula"
                  ancho
                  valor={
                    <ul className="space-y-1">
                      {ficha.variablesDef.map((v) => (
                        <li key={v.clave} className="flex gap-2">
                          <span className="tnum flex-none font-serif font-semibold text-azul-d">
                            {v.clave === "valor" ? "valor" : `(${v.clave})`}
                          </span>
                          <span>{v.descripcion}</span>
                        </li>
                      ))}
                    </ul>
                  }
                />
              ) : ficha.variables ? (
                <Ficha label="Variables" valor={ficha.variables} ancho />
              ) : null}
              {ficha.formula ? (
                <Ficha label="Fórmula de cálculo" valor={ficha.formula} ancho />
              ) : null}
              {ficha.comentarios ? (
                <Ficha label="Comentarios" valor={ficha.comentarios} ancho />
              ) : null}
            </dl>
          </CardBody>
        </Card>
      </div>

      {/* Escala */}
      {ficha.escala.length > 0 ? (
        <Card className="mt-4">
          <CardHeader
            title="Escala de avance"
            meta="el % del nivel reportado alimenta el cumplimiento"
          />
          <CardBody className="p-0">
            <DataTable
              sinCabecera
              celdaClassName="px-4 py-2"
              columnas={[
                {
                  key: "nivel",
                  header: "Nivel",
                  movil: "clave",
                  thClassName: "w-[80px]",
                  tdClassName:
                    "whitespace-nowrap text-[11.5px] font-semibold uppercase tracking-[.04em] text-azul-d",
                  cell: (e) => `Nivel ${e.nivel}`,
                },
                {
                  key: "descripcion",
                  header: "Descripción",
                  movil: "titulo",
                  tdClassName: "text-[12.5px]",
                  cell: (e) => e.descripcion,
                },
                {
                  key: "pct",
                  header: "% máx.",
                  align: "right",
                  tnum: true,
                  movil: "insignia",
                  thClassName: "w-[80px]",
                  tdClassName: "font-semibold",
                  cell: (e) => (
                    <span className="tnum font-semibold">
                      {fmtNum(e.pctMax)}%
                    </span>
                  ),
                },
              ]}
              filas={ficha.escala}
              keyFila={(e) => e.nivel}
            />
          </CardBody>
        </Card>
      ) : null}

      {/* Trayectoria */}
      <Card className="mt-4">
        <CardHeader title="Trayectoria de metas y cumplimiento" meta="plan quinquenal" />
        <CardBody className="p-0">
          <DataTable
            celdaClassName="px-4 py-[10px]"
            columnas={[
              {
                key: "periodo",
                header: "Período",
                movil: "titulo",
                tdClassName: "font-semibold",
                cell: (t) => (
                  <span className="font-serif font-semibold">{t.anio}</span>
                ),
              },
              {
                key: "meta",
                header: "Meta",
                align: "right",
                tnum: true,
                cell: (t) =>
                  t.metaConcluida ? (
                    <span className="text-muted-2">concluido</span>
                  ) : (
                    `${fmtNum(t.meta)}${unidadSufijo}`
                  ),
              },
              {
                key: "aprobado",
                header: "Aprobado",
                align: "right",
                tnum: true,
                cell: (t) =>
                  t.valor === null ? "—" : `${fmtNum(t.valor)}${unidadSufijo}`,
              },
              {
                key: "cumplimiento",
                header: "Cumplimiento",
                align: "right",
                tnum: true,
                cell: (t) => fmtPct(t.capado),
              },
              {
                key: "estado",
                header: "Estado",
                movil: "insignia",
                cell: (t) =>
                  t.valor !== null && t.semaforo ? (
                    <SemPill sem={t.semaforo} />
                  ) : (
                    <Tag>{t.metaConcluida ? "Concluido" : "Planificado"}</Tag>
                  ),
              },
            ]}
            filas={ficha.trayectoria}
            keyFila={(t) => t.anio}
            vacio="Sin trayectoria de metas definida."
          />
        </CardBody>
      </Card>

      {/* Responsables + mediciones */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Responsabilidad y reporte" />
          <CardBody>
            <ul className="space-y-2">
              {ficha.responsables.map((r) => (
                <li key={`${r.dependenciaId}-${r.rol}`} className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px]">{r.nombre}</span>
                  <Tag>{r.rol === "PRINCIPAL" ? "Principal" : "Corresponsable"}</Tag>
                </li>
              ))}
            </ul>
            {ficha.fuenteInfo ? (
              <p className="mt-3 border-t border-linea-2 pt-3 text-[11.5px] text-muted">
                <b>Fuentes:</b> {ficha.fuenteInfo}
              </p>
            ) : null}
            {est.requiereDiagnostico ? (
              <p className="mt-3 rounded-pj-sm border border-purpura-border bg-purpura-bg px-3 py-2 text-[12px] text-purpura">
                Este indicador requiere un diagnóstico o investigación previa
                antes de poder medirse.
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Mediciones registradas"
            meta="todas las versiones (historial append-only)"
          />
          <CardBody className="p-0">
            <DataTable
              celdaClassName="px-4 py-2"
              columnas={[
                {
                  key: "periodo",
                  header: "Período",
                  movil: "clave",
                  cell: (m) => (
                    <span className="font-serif font-semibold">
                      {m.periodoAnio}
                    </span>
                  ),
                },
                {
                  key: "version",
                  header: "Versión",
                  movil: "insignia",
                  cell: (m) => <Tag>v{m.version}</Tag>,
                },
                {
                  key: "valor",
                  header: "Valor",
                  align: "right",
                  tnum: true,
                  movil: "titulo",
                  cell: (m) => (
                    <>
                      <span className="tnum">
                        {fmtValor(m.valorObservado, est.unidad)}
                      </span>
                      {m.valoresVariables ? (
                        <div className="text-[10.5px] font-normal text-muted-2">
                          {Object.entries(m.valoresVariables)
                            .map(([k, v]) => `${k}: ${fmtNum(v)}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </>
                  ),
                },
                {
                  key: "estado",
                  header: "Estado",
                  tdClassName: "text-[12px]",
                  cell: (m) => ESTADO_WF_LABEL[m.estado] ?? m.estado,
                },
                {
                  key: "reporte",
                  header: "Reporte",
                  tdClassName: "text-[12px] text-muted",
                  cell: (m) => fmtFechaCorta(m.fechaReporte),
                },
                {
                  key: "detalle",
                  header: "",
                  tdClassName: "text-[12px]",
                  cell: (m) => (
                    <Link
                      href={`/registro/carga/${m.id}`}
                      className="whitespace-nowrap font-semibold text-azul hover:underline"
                    >
                      Ver carga
                    </Link>
                  ),
                },
              ]}
              filas={ficha.mediciones}
              keyFila={(m) => m.id}
              vacio="Sin mediciones registradas."
            />
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-pj border border-linea bg-superficie px-[13px] py-[11px]">
      <div className="text-[10px] uppercase tracking-[.06em] text-muted">
        {label}
      </div>
      <div className="tnum mt-[5px] break-words font-serif text-[20px]">
        {valor}
      </div>
    </div>
  );
}

function Ficha({
  label,
  valor,
  ancho,
}: {
  label: string;
  valor: React.ReactNode;
  ancho?: boolean;
}) {
  return (
    <div className={`bg-superficie px-3 py-[10px] ${ancho ? "sm:col-span-2" : ""}`}>
      <dt className="text-[10px] uppercase tracking-[.06em] text-muted-2">
        {label}
      </dt>
      <dd className="mt-[3px] text-[13px]">{valor}</dd>
    </div>
  );
}
