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
import { SemPill } from "@/ui/components/sem-pill";
import { ChipWorkflow } from "@/ui/features/shared/chip-workflow";
import { fmtPct, fmtValor } from "@/lib/utils";

export const metadata: Metadata = { title: "Reporte por dependencia" };
export const dynamic = "force-dynamic";

export default async function ReporteDependenciaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const parse = z.coerce.number().int().positive().safeParse(params.id);
  if (!parse.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  const indicadores = estado.indicadores.filter(
    (i) => i.dependenciaPrincipalId === parse.data,
  );
  if (indicadores.length === 0) notFound();
  const nombre = indicadores[0].dependenciaPrincipal;

  const reportables = indicadores.filter(
    (i) => i.meta !== null && !i.metaConcluida,
  );
  const aprobadas = reportables.filter((i) => i.valor !== null).length;

  return (
    <article>
      <MembreteReporte
        titulo="Reporte por dependencia responsable"
        subtitulo={`${nombre} · ejercicio ${anio} · ${indicadores.length} indicadores a cargo (principal)`}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-pj border border-linea px-4 py-2 print:break-inside-avoid">
          <div className="text-[9.5px] uppercase tracking-[.07em] text-muted">
            Cobertura de reporte del período
          </div>
          <div className="tnum mt-1 font-serif text-[22px] leading-none">
            {aprobadas}/{reportables.length}{" "}
            <span className="text-[13px] text-muted">
              (
              {fmtPct(
                reportables.length > 0 ? aprobadas / reportables.length : 0,
              )}
              )
            </span>
          </div>
        </div>
      </div>

      <h2 className={SECCION_REPORTE}>Indicadores a cargo</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_REPORTE}>Cód.</th>
            <th className={TH_REPORTE}>Indicador</th>
            <th className={TH_REPORTE}>OE/AE</th>
            <th className={`${TH_REPORTE} text-right`}>Meta {anio}</th>
            <th className={`${TH_REPORTE} text-right`}>Aprobado</th>
            <th className={`${TH_REPORTE} text-right`}>Cumpl.</th>
            <th className={TH_REPORTE}>Estado carga</th>
            <th className={TH_REPORTE}>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {indicadores.map((i) => (
            <tr key={i.codigo}>
              <td className={`${TD_REPORTE} tnum font-serif font-semibold`}>
                {i.codigo}
              </td>
              <td className={TD_REPORTE}>{i.nombre}</td>
              <td className={`${TD_REPORTE} text-muted`}>
                {i.aeCodigo ?? i.oeCodigo}
              </td>
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

      <p className="mt-3 text-[10.5px] text-muted">
        Se listan los indicadores cuya dependencia principal es {nombre}. Las
        corresponsabilidades no se incluyen en este reporte.
      </p>

      <PieReporte />
    </article>
  );
}
