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
import { WF_CHIP } from "@/ui/features/shared/chip-workflow";
import { fmtPct } from "@/lib/utils";
import type { EstadoWF } from "@/domain/types";

export const metadata: Metadata = { title: "Reporte de gobernanza" };
export const dynamic = "force-dynamic";

export default async function ReporteGobernanzaPage({
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
  const pipeline = new Map<string, number>();
  for (const i of reportables) {
    const k = i.estadoMedicion ?? "SIN_CARGA";
    pipeline.set(k, (pipeline.get(k) ?? 0) + 1);
  }
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

  const porDep = new Map<
    string,
    { esperadas: number; aprobadas: number; pendientes: string[] }
  >();
  for (const i of reportables) {
    const d =
      porDep.get(i.dependenciaPrincipal) ??
      ({ esperadas: 0, aprobadas: 0, pendientes: [] } as {
        esperadas: number;
        aprobadas: number;
        pendientes: string[];
      });
    d.esperadas++;
    if (i.valor !== null) d.aprobadas++;
    else d.pendientes.push(String(i.codigo));
    porDep.set(i.dependenciaPrincipal, d);
  }
  const depsOrdenadas = [...porDep.entries()].sort(
    (a, b) =>
      a[1].aprobadas / a[1].esperadas - b[1].aprobadas / b[1].esperadas ||
      b[1].esperadas - a[1].esperadas,
  );

  return (
    <article>
      <MembreteReporte
        titulo="Gobernanza del reporte"
        subtitulo={`Cobertura y flujo de validación · ejercicio ${anio} · ${reportables.length} indicadores reportables`}
      />

      <h2 className={SECCION_REPORTE}>Flujo de validación del período</h2>
      <div className="flex flex-wrap gap-2">
        {ordenPipeline.map((k) => {
          const n = pipeline.get(k) ?? 0;
          if (n === 0 && (k === "RECTIFICADO" || k === "RECHAZADO")) return null;
          const w = WF_CHIP[k];
          return (
            <div
              key={k}
              className="min-w-[92px] rounded-pj border border-linea px-3 py-2 print:break-inside-avoid"
            >
              <span
                className={`inline-block rounded-chip px-2 py-[2px] text-[10px] font-semibold ${w.cls}`}
              >
                {w.label}
              </span>
              <div className="tnum mt-1 font-serif text-[20px] leading-none">
                {n}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Cobertura global del período: <b>{fmtPct(estado.cobertura.fraccion)}</b>{" "}
        ({estado.cobertura.aprobadas}/{estado.cobertura.esperadas} mediciones
        aprobadas). Solo lo aprobado alimenta los tableros oficiales.
      </p>

      <h2 className={SECCION_REPORTE}>
        Cobertura por dependencia (peor cobertura primero)
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={TH_REPORTE}>Dependencia (principal)</th>
            <th className={`${TH_REPORTE} text-right`}>Aprob./Esper.</th>
            <th className={`${TH_REPORTE} text-right`}>Cobertura</th>
            <th className={TH_REPORTE}>Indicadores sin aprobar</th>
          </tr>
        </thead>
        <tbody>
          {depsOrdenadas.map(([dep, d]) => (
            <tr key={dep}>
              <td className={TD_REPORTE}>{dep}</td>
              <td className={`${TD_REPORTE} tnum text-right`}>
                {d.aprobadas}/{d.esperadas}
              </td>
              <td className={`${TD_REPORTE} tnum text-right font-semibold`}>
                {fmtPct(d.aprobadas / d.esperadas)}
              </td>
              <td className={`${TD_REPORTE} tnum text-muted`}>
                {d.pendientes.join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className={SECCION_REPORTE}>Calidad del dato</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="print:break-inside-avoid">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[.05em] text-muted">
            Requieren diagnóstico previo (
            {estado.indicadores.filter((i) => i.requiereDiagnostico).length})
          </h3>
          <p className="tnum text-[11.5px] text-muted">
            {estado.indicadores
              .filter((i) => i.requiereDiagnostico)
              .map((i) => i.codigo)
              .join(", ")}
          </p>
        </div>
        <div className="print:break-inside-avoid">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[.05em] text-muted">
            Línea base pendiente (
            {estado.indicadores.filter((i) => i.basePendiente).length})
          </h3>
          <p className="tnum text-[11.5px] text-muted">
            {estado.indicadores
              .filter((i) => i.basePendiente)
              .map((i) => `${i.codigo} — ${i.nombre}`)
              .join(" · ") || "Ninguno"}
          </p>
        </div>
      </div>

      <PieReporte />
    </article>
  );
}
