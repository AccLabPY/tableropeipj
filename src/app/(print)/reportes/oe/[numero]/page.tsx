import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { MembreteReporte, PieReporte } from "@/ui/features/reportes/membrete";
import {
  SECCION_REPORTE,
  TD_REPORTE,
  TH_REPORTE,
} from "@/ui/features/reportes/estilos";
import { ProgressBar } from "@/ui/components/progress";
import { SemPill } from "@/ui/components/sem-pill";
import { ChipWorkflow } from "@/ui/features/shared/chip-workflow";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtPct, fmtValor } from "@/lib/utils";

export const metadata: Metadata = { title: "Reporte por objetivo" };
export const dynamic = "force-dynamic";

export default async function ReporteOEPage({
  params,
  searchParams,
}: {
  params: { numero: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const parse = z.coerce.number().int().min(1).max(6).safeParse(params.numero);
  if (!parse.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);
  const oe = estado.objetivos.find((o) => o.numero === parse.data);
  if (!oe) notFound();

  return (
    <article>
      <MembreteReporte
        titulo={`Reporte del Objetivo Estratégico ${oe.numero}`}
        subtitulo={`${oe.codigo} — ${oe.nombre} · ejercicio ${anio} · PND ${oe.pnd.join(" / ") || "—"} · ODS ${oe.ods.join(", ") || "—"}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-pj border border-linea px-4 py-3 print:break-inside-avoid">
        <div>
          <div className="text-[11.5px] uppercase tracking-[.07em] text-muted">
            Avance {anio}
          </div>
          <div
            className="tnum font-serif text-[30px] leading-none"
            style={{ color: SEM_COLORS[oe.semaforo] }}
          >
            {fmtPct(oe.avance)}
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <ProgressBar frac={oe.avance} sem={oe.semaforo} />
        </div>
        <SemPill sem={oe.semaforo} grande />
      </div>

      {oe.indicadorOE ? (
        <p className="mb-4 text-[13px] text-muted">
          Indicador declarado del objetivo (cód. {oe.indicadorOE.codigo}):{" "}
          {oe.indicadorOE.nombre} — cumplimiento{" "}
          <b>{fmtPct(oe.indicadorOE.capado)}</b>. El avance del encabezado es el
          promedio de sus acciones estratégicas (rollup).
        </p>
      ) : null}

      {oe.acciones.map((ae) => (
        <section key={ae.codigo} className="print:break-inside-avoid">
          <h2 className={SECCION_REPORTE}>
            {ae.codigo} — {ae.nombre}{" "}
            <span
              className="tnum ml-2 text-[14.5px]"
              style={{ color: SEM_COLORS[ae.semaforo] }}
            >
              {fmtPct(ae.avance)}
            </span>
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH_REPORTE}>Cód.</th>
                <th className={TH_REPORTE}>Indicador</th>
                <th className={`${TH_REPORTE} text-right`}>Meta {anio}</th>
                <th className={`${TH_REPORTE} text-right`}>Aprobado</th>
                <th className={`${TH_REPORTE} text-right`}>Cumpl.</th>
                <th className={TH_REPORTE}>Estado carga</th>
                <th className={TH_REPORTE}>Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {ae.indicadores.map((i) => (
                <tr key={i.codigo}>
                  <td className={`${TD_REPORTE} tnum font-serif font-semibold`}>
                    {i.codigo}
                  </td>
                  <td className={TD_REPORTE}>{i.nombre}</td>
                  <td className={`${TD_REPORTE} tnum text-right`}>
                    {i.metaConcluida ? "concluido" : fmtValor(i.meta, i.unidad)}
                  </td>
                  <td className={`${TD_REPORTE} tnum text-right`}>
                    {fmtValor(i.valor, i.unidad)}
                  </td>
                  <td className={`${TD_REPORTE} tnum text-right font-semibold`}>
                    {fmtPct(i.capado)}
                  </td>
                  <td className={TD_REPORTE}>
                    <ChipWorkflow estado={i.estadoMedicion ?? "SIN_CARGA"} />
                  </td>
                  <td className={TD_REPORTE}>
                    <SemPill sem={i.semaforo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <PieReporte />
    </article>
  );
}
