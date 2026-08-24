import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink, Paperclip } from "lucide-react";
import { requirePage, tieneRol } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { detalleCarga } from "@/server/services/detalle-carga.service";
import { ApiError } from "@/server/api/api-error";
import { BackButton } from "@/ui/components/back-button";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { ChipWorkflow, WF_CHIP } from "@/ui/features/shared/chip-workflow";
import { PanelValidacionCarga } from "@/ui/features/registro/panel-validacion-carga";
import { cn, fmtBytes, fmtFechaCorta, fmtNum, fmtValor } from "@/lib/utils";
import type { DetalleCargaDTO } from "@/shared/dtos/detalle-carga";

export const metadata: Metadata = { title: "Detalle de carga" };
export const dynamic = "force-dynamic";

/** Punto de color del timeline según el estado alcanzado. */
const PUNTO: Record<string, string> = {
  BORRADOR: "bg-sem-ambar",
  ENVIADO: "bg-azul",
  EN_REVISION: "bg-azul",
  OBSERVADO: "bg-sem-ambar",
  APROBADO: "bg-sem-verde",
  RECHAZADO: "bg-sem-rojo",
  RECTIFICADO: "bg-sem-gris",
};

function fmtFechaHora(isoStr: string): string {
  return new Date(isoStr).toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Asuncion",
  });
}

export default async function DetalleCargaPage({
  params,
}: {
  params: { id: string };
}) {
  const actor = await requirePage("DEPENDENCIA_CARGA", "DGPD_VALIDADOR", "ADMIN");
  const ctx = await getCtx(actor);
  if (!/^\d+$/.test(params.id)) notFound();

  let d: DetalleCargaDTO;
  try {
    d = await detalleCarga(ctx, BigInt(params.id));
  } catch (e) {
    // 404 propio y 404 por scoping (una dependencia no ve cargas ajenas).
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }
  const m = d.medicion;
  const ind = d.indicador;
  const puedeValidar = tieneRol(actor, "DGPD_VALIDADOR", "ADMIN");

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton />
        <Link
          href={`/indicadores/${ind.codigo}?anio=${m.periodoAnio}`}
          className="inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-tinta hover:bg-hover agentes:rounded-chip"
        >
          Ver ficha del indicador
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Cabecera: mismo lenguaje visual que la ficha del indicador
          (jerarquía OE › AE, título serif, dato grande a la derecha). */}
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[420px]">
          <div className="flex flex-wrap items-center gap-[7px]">
            <span className="rounded-pj-sm bg-navy px-2 py-[3px] text-2xs font-semibold uppercase tracking-[.06em] text-white">
              {ind.oeCodigo}
            </span>
            {ind.aeCodigo ? (
              <>
                <span className="text-[12px] leading-none text-muted-2">›</span>
                <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                  {ind.aeCodigo}
                </span>
              </>
            ) : (
              <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                Indicador de objetivo
              </span>
            )}
            <Tag>Carga v{m.version}</Tag>
            <Tag>Ejercicio {m.periodoAnio}</Tag>
          </div>

          <h1 className="mt-[10px] font-serif text-titulo leading-tight">
            <span className="text-azul-d">{ind.codigo}</span> · {ind.nombre}
          </h1>

          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-[10px] border-l-2 border-azul-line pl-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                Dependencia que reporta
              </div>
              <div className="mt-[3px] text-[12.5px] leading-relaxed text-tinta">
                {m.dependencia}
                {d.cargadorNombre ? (
                  <span className="text-muted"> · cargado por {d.cargadorNombre}</span>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                Fecha de reporte
              </div>
              <div className="mt-[3px] text-[12.5px] leading-relaxed text-tinta">
                {fmtFechaCorta(m.fechaReporte)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-none flex-col items-start gap-[6px] sm:items-end">
          <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
            Valor observado
          </div>
          <div className="tnum font-serif text-[30px] leading-none text-tinta">
            {fmtValor(m.valorObservado, ind.unidad)}
          </div>
          <ChipWorkflow estado={m.estado} />
        </div>
      </div>
      <div className="mb-5 h-px bg-linea" />

      {/* Panel de resolución del validador — solo sobre la última versión */}
      {puedeValidar && d.esUltimaVersion ? (
        <PanelValidacionCarga medicionId={m.id} estado={m.estado} />
      ) : null}
      {puedeValidar && !d.esUltimaVersion ? (
        <p className="mb-4 rounded-pj-sm border border-sem-ambar-border bg-sem-ambar-bg px-3 py-2 text-[12px] text-sem-ambar-fg">
          Esta es una versión histórica (existe una versión posterior): las
          resoluciones se toman sobre la última versión de la carga.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {/* Qué se cargó */}
        <Card>
          <CardHeader title="Qué se cargó" meta={`v${m.version}`} />
          <CardBody className="space-y-3 text-[13px]">
            {m.nivelEscala != null ? (
              <div>
                <div className="text-2xs uppercase tracking-[.08em] text-muted">
                  Nivel de escala reportado
                </div>
                <div className="mt-[2px]">Nivel {m.nivelEscala}</div>
              </div>
            ) : null}
            {m.valoresVariables ? (
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                {Object.entries(m.valoresVariables).map(([clave, valor]) => {
                  const def = ind.variablesDef.find((v) => v.clave === clave);
                  return (
                    <div
                      key={clave}
                      className="rounded-pj-sm border border-linea bg-zebra px-3 py-2"
                    >
                      <div className="text-2xs uppercase tracking-[.06em] text-muted">
                        <b className="font-serif normal-case text-azul-d">
                          {clave === "valor" ? "Valor" : `(${clave})`}
                        </b>
                        {def ? (
                          <span className="ml-1 normal-case tracking-normal">
                            {def.descripcion.length > 60
                              ? `${def.descripcion.slice(0, 60)}…`
                              : def.descripcion}
                          </span>
                        ) : null}
                      </div>
                      <div className="tnum mt-[2px] text-[15px] font-semibold">
                        {fmtNum(valor)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div>
              <div className="text-2xs uppercase tracking-[.08em] text-muted">
                Fuente / medio de verificación
              </div>
              <div className="mt-[2px]">{m.fuente ?? "—"}</div>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-[.08em] text-muted">
                Observaciones de la carga
              </div>
              <div className="mt-[2px] whitespace-pre-line">
                {m.observaciones ?? "—"}
              </div>
            </div>
            {m.fechaCorte ? (
              <div>
                <div className="text-2xs uppercase tracking-[.08em] text-muted">
                  Fecha de corte
                </div>
                <div className="mt-[2px]">{fmtFechaCorta(m.fechaCorte)}</div>
              </div>
            ) : null}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {/* Evidencias */}
          <Card>
            <CardHeader
              title="Evidencias respaldatorias"
              meta={`${m.evidencias.length}`}
            />
            <CardBody className="space-y-2">
              {m.evidencias.length === 0 ? (
                <p className="text-[12.5px] text-muted">
                  Esta carga no tiene archivos adjuntos.
                </p>
              ) : (
                m.evidencias.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-pj-sm border border-linea px-3 py-2"
                  >
                    <Paperclip className="h-4 w-4 flex-none text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold">
                        {e.nombreArchivo}
                      </div>
                      <div className="text-[10.5px] text-muted-2">
                        {e.tamanioBytes != null
                          ? fmtBytes(e.tamanioBytes)
                          : "referencia"}{" "}
                        · {fmtFechaCorta(e.fecha)}
                      </div>
                    </div>
                    {e.tieneArchivo ? (
                      <a
                        href={`/api/v1/evidencias/${e.id}`}
                        className="inline-flex flex-none items-center gap-[5px] rounded-pj border border-linea px-2 py-1 text-[11px] font-semibold hover:bg-hover agentes:rounded-chip"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Descargar
                      </a>
                    ) : e.rutaOUrl ? (
                      <a
                        href={e.rutaOUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none text-[11px] font-semibold text-azul hover:underline"
                      >
                        Ver referencia
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Resoluciones DGPD */}
          <Card>
            <CardHeader title="Resoluciones de la DGPD" meta={`${d.resoluciones.length}`} />
            <CardBody className="space-y-2">
              {d.resoluciones.length === 0 ? (
                <p className="text-[12.5px] text-muted">
                  Aún no hay resoluciones sobre esta carga.
                </p>
              ) : (
                d.resoluciones.map((v, ix) => (
                  <div
                    key={ix}
                    className={cn(
                      "rounded-pj-sm px-3 py-2 text-[12px]",
                      v.resultado === "APROBADO" && "bg-sem-verde-bg text-sem-verde-fg",
                      v.resultado === "OBSERVADO" && "bg-sem-ambar-bg text-sem-ambar-fg",
                      v.resultado === "RECHAZADO" && "bg-sem-rojo-bg text-sem-rojo-fg",
                    )}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <b>{WF_CHIP[v.resultado].label}</b>
                      <span className="text-[10.5px] opacity-80">
                        {v.actorNombre ? `${v.actorNombre} · ` : ""}
                        {fmtFechaHora(v.fecha)}
                      </span>
                    </div>
                    {v.comentario ? (
                      <p className="mt-1 whitespace-pre-line">{v.comentario}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Timeline del historial */}
      <Card className="mt-4">
        <CardHeader
          title="Historial de estados"
          meta="trazabilidad completa (append-only)"
        />
        <CardBody>
          <ol className="relative ml-[7px] space-y-5 border-l-2 border-linea pl-6">
            {d.historial.map((h, ix) => (
              <li key={ix} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[31px] top-[3px] h-3 w-3 rounded-full ring-4 ring-superficie",
                    PUNTO[h.estadoNuevo] ?? "bg-sem-gris",
                  )}
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {h.estadoAnterior ? (
                    <>
                      <ChipWorkflow estado={h.estadoAnterior} />
                      <span aria-hidden="true" className="text-muted-2">
                        →
                      </span>
                    </>
                  ) : null}
                  <ChipWorkflow estado={h.estadoNuevo} />
                  <span className="text-[11px] text-muted-2">
                    {fmtFechaHora(h.fecha)}
                    {h.actorNombre ? ` · ${h.actorNombre}` : ""}
                  </span>
                </div>
                {h.comentario ? (
                  <p className="mt-1 max-w-2xl text-[12.5px] text-tinta">
                    “{h.comentario}”
                  </p>
                ) : null}
              </li>
            ))}
            {d.historial.length === 0 ? (
              <li className="text-[12.5px] text-muted">Sin eventos registrados.</li>
            ) : null}
          </ol>
        </CardBody>
      </Card>
    </section>
  );
}
