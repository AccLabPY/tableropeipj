import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { listarRiesgos } from "@/server/repositories/riesgo.repo";
import { MembreteReporte, PieReporte } from "@/ui/features/reportes/membrete";
import {
  SECCION_REPORTE,
  TD_REPORTE,
  TH_REPORTE,
} from "@/ui/features/reportes/estilos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Riesgos estratégicos" };
export const dynamic = "force-dynamic";

/** Color según el nivel 1-5 (probabilidad/impacto). */
function celdaNivel(n: number | null) {
  if (n === null) return { texto: "—", cls: "text-muted" };
  if (n >= 4) return { texto: String(n), cls: "bg-sem-rojo-bg text-[#8f2f2f] font-semibold" };
  if (n === 3) return { texto: String(n), cls: "bg-sem-ambar-bg text-[#8a6412] font-semibold" };
  return { texto: String(n), cls: "bg-sem-verde-bg text-[#1f6a49] font-semibold" };
}

export default async function ReporteRiesgosPage() {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const riesgos = await listarRiesgos(ctx);

  const porOE = new Map<string, { nombre: string; items: typeof riesgos }>();
  for (const r of riesgos) {
    const g = porOE.get(r.oe.codigo) ?? { nombre: r.oe.nombre, items: [] };
    g.items.push(r);
    porOE.set(r.oe.codigo, g);
  }

  return (
    <article>
      <MembreteReporte
        titulo="Riesgos estratégicos del PEI"
        subtitulo={`Matriz probabilidad × impacto y mitigación · ${riesgos.length} riesgos identificados`}
      />

      {[...porOE.entries()].map(([codigo, g]) => (
        <section key={codigo} className="print:break-inside-avoid">
          <h2 className={SECCION_REPORTE}>
            {codigo} — {g.nombre}
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH_REPORTE}>Riesgo</th>
                <th className={`${TH_REPORTE} w-[52px] text-center`}>Prob.</th>
                <th className={`${TH_REPORTE} w-[52px] text-center`}>Imp.</th>
                <th className={`${TH_REPORTE} w-[90px]`}>Evaluación</th>
                <th className={TH_REPORTE}>Mitigación</th>
              </tr>
            </thead>
            <tbody>
              {g.items.map((r) => {
                const p = celdaNivel(r.probabilidad);
                const i = celdaNivel(r.impacto);
                return (
                  <tr key={r.id}>
                    <td className={TD_REPORTE}>{r.descripcion}</td>
                    <td className={cn(TD_REPORTE, "tnum text-center", p.cls)}>
                      {p.texto}
                    </td>
                    <td className={cn(TD_REPORTE, "tnum text-center", i.cls)}>
                      {i.texto}
                    </td>
                    <td className={TD_REPORTE}>{r.evaluacion ?? "—"}</td>
                    <td className={cn(TD_REPORTE, "text-muted")}>
                      {r.mitigacion ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      <PieReporte />
    </article>
  );
}
