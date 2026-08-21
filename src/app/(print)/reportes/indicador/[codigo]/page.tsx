import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { fichaIndicador } from "@/server/services/indicador-ficha.service";
import { ApiError } from "@/server/api/api-error";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";
import { MembreteReporte, PieReporte } from "@/ui/features/reportes/membrete";
import {
  SECCION_REPORTE,
  TD_REPORTE,
  TH_REPORTE,
} from "@/ui/features/reportes/estilos";
import { SemPill } from "@/ui/components/sem-pill";
import { ChipWorkflow } from "@/ui/features/shared/chip-workflow";
import { LazySerieIndicador } from "@/ui/charts/lazy";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtBytes, fmtFechaCorta, fmtNum, fmtPct, fmtValor } from "@/lib/utils";
import type { IndicadorFichaDTO } from "@/shared/dtos/indicador-ficha";

export const metadata: Metadata = { title: "Ficha de indicador" };
export const dynamic = "force-dynamic";

export default async function ReporteIndicadorPage({
  params,
  searchParams,
}: {
  params: { codigo: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const parse = CodigoParam.safeParse(params.codigo);
  if (!parse.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);

  let ficha: IndicadorFichaDTO;
  try {
    ficha = await fichaIndicador(ctx, parse.data, anio);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const est = ficha.estado;
  const sufijo = est.unidad === "PORCENTAJE" ? "%" : "";

  return (
    <article>
      <MembreteReporte
        titulo={`Ficha del indicador ${est.codigo}`}
        subtitulo={`${est.nombre} · ejercicio ${anio}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-pj border border-linea px-4 py-3 print:break-inside-avoid">
        <div>
          <div className="text-[10px] uppercase tracking-[.07em] text-muted">
            Cumplimiento {anio}
          </div>
          <div
            className="tnum font-serif text-[26px] leading-none"
            style={{ color: SEM_COLORS[est.semaforo] }}
          >
            {fmtPct(est.capado)}
          </div>
        </div>
        <SemPill sem={est.semaforo} grande />
        <ChipWorkflow estado={est.estadoMedicion ?? "SIN_CARGA"} />
      </div>

      <h2 className={SECCION_REPORTE}>Bloque técnico</h2>
      <table className="w-full border-collapse">
        <tbody>
          {(
            [
              ["Objetivo estratégico", `${est.oeCodigo} — ${ficha.oeNombre}`],
              est.aeCodigo
                ? ["Acción estratégica", `${est.aeCodigo} — ${ficha.aeNombre}`]
                : null,
              ["Descripción", ficha.descripcion ?? "—"],
              ["Fórmula", ficha.formula ?? "—"],
              ["Variables", ficha.variables ?? "—"],
              [
                "Unidad · Sentido · Dimensión",
                `${est.unidad} · ${est.sentido === "ASC" ? "Ascendente" : "Descendente"} · ${est.dimension ?? "—"}`,
              ],
              [
                "Línea base",
                est.basePendiente
                  ? "a determinar"
                  : `${fmtNum(est.lineaBase)}${sufijo} (${ficha.anioLineaBase ?? "—"})`,
              ],
              [
                `Meta ${anio}`,
                est.metaConcluida
                  ? "concluido (ciclo de vida)"
                  : `${fmtNum(est.meta)}${sufijo}`,
              ],
              ["Frecuencia · Cobertura", `${ficha.frecuencia} · ${ficha.cobertura}`],
              ["Fuentes de información", ficha.fuenteInfo ?? "—"],
              [
                "Responsables",
                ficha.responsables
                  .map(
                    (r) =>
                      `${r.nombre} (${r.rol === "PRINCIPAL" ? "Principal" : r.rol === "CORRESPONSABLE" ? "Corresponsable" : "Fuente"})`,
                  )
                  .join(" · ") || "—",
              ],
            ] as ([string, string] | null)[]
          )
            .filter((f): f is [string, string] => f !== null)
            .map(([k, v]) => (
              <tr key={k}>
                <td
                  className={`${TD_REPORTE} w-[190px] text-[10px] font-semibold uppercase tracking-[.05em] text-muted`}
                >
                  {k}
                </td>
                <td className={TD_REPORTE}>{v}</td>
              </tr>
            ))}
        </tbody>
      </table>

      <h2 className={SECCION_REPORTE}>Avance en el tiempo</h2>
      <div className="print:break-inside-avoid">
        <LazySerieIndicador
          trayectoria={ficha.trayectoria}
          lineaBase={est.lineaBase}
          unidad={est.unidad}
          fijo
        />
      </div>

      <h2 className={SECCION_REPORTE}>Mediciones registradas</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_REPORTE}>Período</th>
            <th className={TH_REPORTE}>Ver.</th>
            <th className={`${TH_REPORTE} text-right`}>Valor</th>
            <th className={TH_REPORTE}>Variables</th>
            <th className={TH_REPORTE}>Estado</th>
            <th className={TH_REPORTE}>Fuente</th>
            <th className={TH_REPORTE}>Reporte</th>
          </tr>
        </thead>
        <tbody>
          {ficha.mediciones.map((m) => (
            <tr key={m.id}>
              <td className={`${TD_REPORTE} tnum`}>{m.periodoAnio}</td>
              <td className={`${TD_REPORTE} tnum`}>v{m.version}</td>
              <td className={`${TD_REPORTE} tnum text-right font-semibold`}>
                {fmtValor(m.valorObservado, est.unidad)}
              </td>
              <td className={`${TD_REPORTE} tnum text-muted`}>
                {m.nivelEscala != null
                  ? `nivel ${m.nivelEscala}`
                  : m.valoresVariables
                    ? Object.entries(m.valoresVariables)
                        .map(([k, v]) => `${k}=${fmtNum(v)}`)
                        .join(" · ")
                    : "—"}
              </td>
              <td className={TD_REPORTE}>
                <ChipWorkflow estado={m.estado} />
              </td>
              <td className={`${TD_REPORTE} text-muted`}>{m.fuente ?? "—"}</td>
              <td className={`${TD_REPORTE} tnum`}>
                {fmtFechaCorta(m.fechaReporte)}
              </td>
            </tr>
          ))}
          {ficha.mediciones.length === 0 ? (
            <tr>
              <td colSpan={7} className={`${TD_REPORTE} text-center text-muted`}>
                Sin mediciones registradas.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {ficha.mediciones.some((m) => m.evidencias.length > 0) ? (
        <>
          <h2 className={SECCION_REPORTE}>Evidencias respaldatorias</h2>
          <ul className="list-disc space-y-1 pl-5 text-[11.5px]">
            {ficha.mediciones.flatMap((m) =>
              m.evidencias.map((e) => (
                <li key={e.id}>
                  {e.nombreArchivo}{" "}
                  <span className="text-muted">
                    ({m.periodoAnio} v{m.version} ·{" "}
                    {e.tamanioBytes != null ? fmtBytes(e.tamanioBytes) : "referencia"}{" "}
                    · {fmtFechaCorta(e.fecha)})
                  </span>
                </li>
              )),
            )}
          </ul>
        </>
      ) : null}

      <PieReporte />
    </article>
  );
}
