import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { ProgressBar } from "@/ui/components/progress";
import { AnioSelector } from "@/ui/components/anio-selector";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtPct } from "@/lib/utils";

export const metadata: Metadata = { title: "Objetivos estratégicos" };
export const dynamic = "force-dynamic";

/**
 * Vista de Objetivos: OE → AE → Indicador. Los indicadores se agrupan por
 * Acción Estratégica con el avance agregado de cada AE (capa intermedia
 * obligatoria — invariante 9 del prompt maestro).
 */
export default async function ObjetivosPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  return (
    <section>
      <PageHeader
        title="Objetivos estratégicos"
        subtitle="Trazabilidad OE → Acción Estratégica → Indicador, con vínculo al PND y ODS 16"
        right={<AnioSelector anio={anio} />}
      />
      <div className="grid grid-cols-2 gap-4 max-[1080px]:grid-cols-1">
        {estado.objetivos.map((oe) => (
          <Card key={oe.codigo}>
            <CardHeader
              title={
                <>
                  <span className="font-serif text-azul-d">{oe.codigo}</span> ·{" "}
                  {oe.nombre}
                </>
              }
            />
            <CardBody>
              <div className="mb-[14px] flex items-center gap-[14px]">
                <div className="flex-none">
                  <div className="text-[11px] text-muted">Avance {anio}</div>
                  <div
                    className="font-serif text-[26px]"
                    style={{ color: SEM_COLORS[oe.semaforo] }}
                  >
                    {fmtPct(oe.avance)}
                  </div>
                </div>
                <div className="flex-1">
                  <ProgressBar frac={oe.avance} sem={oe.semaforo} alto="h-[10px]" />
                  <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted">
                    <span>
                      {oe.acciones.length} acciones ·{" "}
                      {oe.acciones.reduce(
                        (a, ae) => a + ae.indicadores.length,
                        0,
                      )}{" "}
                      indicadores
                    </span>
                    <span>·</span>
                    <span>PND {oe.pnd.join(" / ")}</span>
                    <span>·</span>
                    <span>ODS {oe.ods.join(", ")}</span>
                  </div>
                </div>
              </div>

              <div className="scroll-pj max-h-[340px] overflow-y-auto pr-1">
                {oe.acciones.map((ae) => (
                  <div
                    key={ae.codigo}
                    className="mb-[10px] overflow-hidden rounded-pj border border-linea-2 last:mb-0"
                  >
                    <div className="flex items-center gap-[10px] border-b border-linea-2 bg-[#F7F9FB] px-[11px] py-2">
                      <span className="flex-none font-serif text-[12px] font-semibold text-azul-d">
                        {ae.codigo}
                      </span>
                      <span className="flex-1 text-[12px] leading-tight">
                        {ae.nombre.length > 72
                          ? `${ae.nombre.slice(0, 72)}…`
                          : ae.nombre}
                      </span>
                      <span className="h-[6px] w-[66px] flex-none overflow-hidden rounded bg-linea">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.round((ae.avance ?? 0) * 100)}%`,
                            background: SEM_COLORS[ae.semaforo],
                          }}
                        />
                      </span>
                      <span
                        className="tnum w-10 flex-none text-right text-[13px] font-semibold"
                        style={{ color: SEM_COLORS[ae.semaforo] }}
                      >
                        {fmtPct(ae.avance)}
                      </span>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {ae.indicadores.map((i) => (
                          <tr key={i.codigo} className="hover:bg-azul-soft">
                            <td className="w-[56px] border-b border-linea-2 px-[11px] py-2">
                              <Link
                                href={`/indicadores/${i.codigo}?anio=${anio}`}
                                className="font-serif font-semibold text-azul-d hover:underline"
                              >
                                {i.codigo}
                              </Link>
                            </td>
                            <td className="border-b border-linea-2 px-[11px] py-2 text-[12.5px]">
                              {i.nombre.length > 90
                                ? `${i.nombre.slice(0, 90)}…`
                                : i.nombre}
                            </td>
                            <td className="tnum w-[60px] border-b border-linea-2 px-[11px] py-2 text-right text-[12.5px]">
                              {fmtPct(i.capado)}
                            </td>
                            <td className="w-[110px] border-b border-linea-2 px-[11px] py-2">
                              <SemPill sem={i.semaforo} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
