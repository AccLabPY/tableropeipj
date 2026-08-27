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

export const metadata: Metadata = { title: "Reporte por acción estratégica" };
export const dynamic = "force-dynamic";

export default async function ReporteAEPage({
  params,
  searchParams,
}: {
  params: { codigo: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const parse = z
    .string()
    .regex(/^A\.E\.[1-6]\.\d{1,2}$/)
    .safeParse(decodeURIComponent(params.codigo));
  if (!parse.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  const oe = estado.objetivos.find((o) =>
    o.acciones.some((a) => a.codigo === parse.data),
  );
  const ae = oe?.acciones.find((a) => a.codigo === parse.data);
  if (!oe || !ae) notFound();

  return (
    <article>
      <MembreteReporte
        titulo={`Reporte de la Acción Estratégica ${ae.codigo}`}
        subtitulo={`${ae.nombre} · ${oe.codigo} — ${oe.nombre} · ejercicio ${anio}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-pj border border-linea px-4 py-3 print:break-inside-avoid">
        <div>
          <div className="text-[11.5px] uppercase tracking-[.07em] text-muted">
            Avance {anio}
          </div>
          <div
            className="tnum font-serif text-[30px] leading-none"
            style={{ color: SEM_COLORS[ae.semaforo] }}
          >
            {fmtPct(ae.avance)}
          </div>
        </div>
        <div className="min-w-[200px] flex-1">
          <ProgressBar frac={ae.avance} sem={ae.semaforo} />
        </div>
        <SemPill sem={ae.semaforo} grande />
      </div>

      <h2 className={SECCION_REPORTE}>
        Indicadores de la acción ({ae.indicadores.length})
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_REPORTE}>Cód.</th>
            <th className={TH_REPORTE}>Indicador</th>
            <th className={TH_REPORTE}>Dependencia responsable</th>
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
              <td className={`${TD_REPORTE} text-muted`}>
                {i.dependenciaPrincipal}
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

      <PieReporte />
    </article>
  );
}
