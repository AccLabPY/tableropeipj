import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { fichaIndicador } from "@/server/services/indicador-ficha.service";
import { ApiError } from "@/server/api/api-error";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { BackButton } from "@/ui/components/back-button";
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
  const unidadSufijo = est.unidad === "PORCENTAJE" ? "%" : "";
  const brecha =
    est.valor === null || est.meta === null || est.basePendiente
      ? null
      : est.sentido === "ASC"
        ? est.meta - est.valor
        : est.valor - est.meta;

  return (
    <section>
      <BackButton />
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[21px] leading-tight">
            <span className="text-azul-d">{est.codigo}</span> · {est.nombre}
          </h1>
          <div className="mt-1 text-[12.5px] text-muted">
            {est.aeCodigo ? `${est.aeCodigo} — ${ficha.aeNombre}` : "Indicador de nivel OE"} ·{" "}
            {est.oeCodigo} · {est.dependenciaPrincipal}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-[10px] uppercase tracking-[.06em] text-muted">
            Cumplimiento {anio}
          </div>
          <div
            className="font-serif text-[30px] leading-none"
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
      <div className="mb-4 grid grid-cols-2 gap-[10px] sm:grid-cols-3 xl:grid-cols-5">
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
              <p className="mb-3 rounded-pj-sm border border-[#EAD9AE] bg-sem-ambar-bg px-3 py-2 text-[12px] text-sem-ambar">
                Línea base pendiente ({ficha.comentarios ?? "a determinar al cierre de 2025"}):
                el cumplimiento no se computa hasta definirla.
              </p>
            ) : null}
            <div className="min-h-[280px] flex-1">
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
              {ficha.variables ? (
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
            <table className="w-full">
              <tbody>
                {ficha.escala.map((e) => (
                  <tr key={e.nivel}>
                    <td className="w-[80px] whitespace-nowrap border-b border-linea-2 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[.04em] text-azul-d">
                      Nivel {e.nivel}
                    </td>
                    <td className="border-b border-linea-2 px-4 py-2 text-[12.5px]">
                      {e.descripcion}
                    </td>
                    <td className="tnum w-[80px] border-b border-linea-2 px-4 py-2 text-right font-semibold">
                      {fmtNum(e.pctMax)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}

      {/* Trayectoria */}
      <Card className="mt-4">
        <CardHeader title="Trayectoria de metas y cumplimiento" meta="plan quinquenal" />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[460px]">
            <thead>
              <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                <th className="border-b border-linea px-4 py-2">Período</th>
                <th className="border-b border-linea px-4 py-2 text-right">Meta</th>
                <th className="border-b border-linea px-4 py-2 text-right">Aprobado</th>
                <th className="border-b border-linea px-4 py-2 text-right">Cumplimiento</th>
                <th className="border-b border-linea px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ficha.trayectoria.map((t) => (
                <tr key={t.anio} className="hover:bg-[#F8FAFB]">
                  <td className="border-b border-linea-2 px-4 py-[10px] font-semibold">
                    {t.anio}
                  </td>
                  <td className="tnum border-b border-linea-2 px-4 py-[10px] text-right">
                    {t.metaConcluida ? (
                      <span className="text-muted-2">concluido</span>
                    ) : (
                      `${fmtNum(t.meta)}${unidadSufijo}`
                    )}
                  </td>
                  <td className="tnum border-b border-linea-2 px-4 py-[10px] text-right">
                    {t.valor === null ? "—" : `${fmtNum(t.valor)}${unidadSufijo}`}
                  </td>
                  <td className="tnum border-b border-linea-2 px-4 py-[10px] text-right">
                    {fmtPct(t.capado)}
                  </td>
                  <td className="border-b border-linea-2 px-4 py-[10px]">
                    {t.valor !== null && t.semaforo ? (
                      <SemPill sem={t.semaforo} />
                    ) : (
                      <Tag>{t.metaConcluida ? "Concluido" : "Planificado"}</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <p className="mt-3 rounded-pj-sm border border-[#DDCBEC] bg-[#EFE7F5] px-3 py-2 text-[12px] text-[#6b3fa0]">
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
          <CardBody className="overflow-x-auto p-0">
            {ficha.mediciones.length === 0 ? (
              <p className="px-4 py-6 text-center text-muted">
                Sin mediciones registradas.
              </p>
            ) : (
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                    <th className="border-b border-linea px-4 py-2">Período</th>
                    <th className="border-b border-linea px-4 py-2">Versión</th>
                    <th className="border-b border-linea px-4 py-2 text-right">Valor</th>
                    <th className="border-b border-linea px-4 py-2">Estado</th>
                    <th className="border-b border-linea px-4 py-2">Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.mediciones.map((m) => (
                    <tr key={m.id}>
                      <td className="border-b border-linea-2 px-4 py-2">
                        {m.periodoAnio}
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2">
                        v{m.version}
                      </td>
                      <td className="tnum border-b border-linea-2 px-4 py-2 text-right">
                        {fmtValor(m.valorObservado, est.unidad)}
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2 text-[12px]">
                        {ESTADO_WF_LABEL[m.estado] ?? m.estado}
                      </td>
                      <td className="border-b border-linea-2 px-4 py-2 text-[12px] text-muted">
                        {fmtFechaCorta(m.fechaReporte)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
      <div className="tnum mt-[5px] font-serif text-[20px]">{valor}</div>
    </div>
  );
}

function Ficha({
  label,
  valor,
  ancho,
}: {
  label: string;
  valor: string;
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
