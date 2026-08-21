import type { Metadata } from "next";
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
import { LazyDonutSemaforo } from "@/ui/charts/lazy";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtPct, fmtValor } from "@/lib/utils";

export const metadata: Metadata = { title: "Reporte ejecutivo" };
export const dynamic = "force-dynamic";

export default async function ReporteEjecutivoPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  const atencion = estado.indicadores
    .filter((i) => i.capado !== null)
    .sort((a, b) => a.capado! - b.capado!)
    .slice(0, 12);

  return (
    <article>
      <MembreteReporte
        titulo="Reporte ejecutivo del PEI"
        subtitulo={`Ejercicio ${anio} · 6 objetivos estratégicos · ${estado.indicadores.length} indicadores`}
      />

      <h2 className={SECCION_REPORTE}>Indicadores clave del ejercicio</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Kpi
          etiqueta={`Índice de cumplimiento ${anio}`}
          valor={fmtPct(estado.indicePEI)}
        />
        {(
          [
            ["VERDE", "En meta"],
            ["AMARILLO", "En riesgo"],
            ["ROJO", "Críticos"],
          ] as const
        ).map(([sem, label]) => (
          <Kpi
            key={sem}
            etiqueta={label}
            valor={String(estado.distribucion[sem])}
            color={SEM_COLORS[sem]}
          />
        ))}
        <Kpi
          etiqueta="Cobertura de reporte"
          valor={`${estado.cobertura.aprobadas}/${estado.cobertura.esperadas}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-[1fr_280px]">
        <div>
          <h2 className={SECCION_REPORTE}>Avance por objetivo estratégico</h2>
          {estado.objetivos.map((oe) => (
            <div
              key={oe.codigo}
              className="grid grid-cols-[44px_1fr_48px] items-center gap-3 border-b border-linea-2 py-[8px] last:border-b-0 print:break-inside-avoid"
            >
              <div className="font-serif text-[13px] font-semibold text-azul-d">
                {oe.codigo}
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] leading-[1.3]">{oe.nombre}</div>
                <div className="mt-[5px]">
                  <ProgressBar frac={oe.avance} sem={oe.semaforo} />
                </div>
              </div>
              <div
                className="tnum text-right text-[13px] font-semibold"
                style={{ color: SEM_COLORS[oe.semaforo] }}
              >
                {fmtPct(oe.avance)}
              </div>
            </div>
          ))}
        </div>
        <div className="print:break-inside-avoid">
          <h2 className={SECCION_REPORTE}>Distribución del semáforo</h2>
          <LazyDonutSemaforo distribucion={estado.distribucion} fijo />
          <ul className="mt-1 space-y-[3px] text-[11px] text-muted">
            {(["VERDE", "AMARILLO", "ROJO", "GRIS"] as const).map((s) => (
              <li key={s} className="flex items-center gap-[6px]">
                <span
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: SEM_COLORS[s] }}
                />
                {
                  {
                    VERDE: "En meta",
                    AMARILLO: "En riesgo",
                    ROJO: "Crítico",
                    GRIS: "Pendiente",
                  }[s]
                }{" "}
                ({estado.distribucion[s]})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className={SECCION_REPORTE}>
        Indicadores que requieren atención (cumplimiento ascendente)
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_REPORTE}>Cód.</th>
            <th className={TH_REPORTE}>Indicador</th>
            <th className={TH_REPORTE}>OE</th>
            <th className={TH_REPORTE}>Dependencia responsable</th>
            <th className={`${TH_REPORTE} text-right`}>Meta {anio}</th>
            <th className={`${TH_REPORTE} text-right`}>Aprobado</th>
            <th className={`${TH_REPORTE} text-right`}>Cumpl.</th>
            <th className={TH_REPORTE}>Semáforo</th>
          </tr>
        </thead>
        <tbody>
          {atencion.map((i) => (
            <tr key={i.codigo}>
              <td className={`${TD_REPORTE} tnum font-serif font-semibold`}>
                {i.codigo}
              </td>
              <td className={TD_REPORTE}>{i.nombre}</td>
              <td className={TD_REPORTE}>{i.oeCodigo}</td>
              <td className={`${TD_REPORTE} text-muted`}>
                {i.dependenciaPrincipal}
              </td>
              <td className={`${TD_REPORTE} tnum text-right`}>
                {fmtValor(i.meta, i.unidad)}
              </td>
              <td className={`${TD_REPORTE} tnum text-right`}>
                {fmtValor(i.valor, i.unidad)}
              </td>
              <td className={`${TD_REPORTE} tnum text-right font-semibold`}>
                {fmtPct(i.capado)}
              </td>
              <td className={TD_REPORTE}>
                <SemPill sem={i.semaforo} />
              </td>
            </tr>
          ))}
          {atencion.length === 0 ? (
            <tr>
              <td colSpan={8} className={`${TD_REPORTE} text-center text-muted`}>
                Sin mediciones aprobadas en el período.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <PieReporte />
    </article>
  );
}

function Kpi({
  etiqueta,
  valor,
  color,
}: {
  etiqueta: string;
  valor: string;
  color?: string;
}) {
  return (
    <div className="rounded-pj border border-linea px-3 py-2 print:break-inside-avoid">
      <div className="text-[9.5px] uppercase tracking-[.07em] text-muted">
        {etiqueta}
      </div>
      <div
        className="tnum mt-1 font-serif text-[22px] leading-none"
        style={color ? { color } : undefined}
      >
        {valor}
      </div>
    </div>
  );
}
