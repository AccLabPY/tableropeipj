import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
              <div className="mb-[14px] flex flex-wrap items-center gap-[14px]">
                <div className="flex-none">
                  <div className="text-[11px] text-muted">Avance {anio}</div>
                  <div
                    className="font-serif text-seccion"
                    style={{ color: SEM_COLORS[oe.semaforo] }}
                  >
                    {fmtPct(oe.avance)}
                  </div>
                </div>
                <div className="min-w-0 flex-1 basis-40">
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
                    <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px] border-b border-linea-2 bg-[#F7F9FB] px-[11px] py-2">
                      <span className="flex-none font-serif text-[12px] font-semibold text-azul-d">
                        {ae.codigo}
                      </span>
                      <span className="min-w-0 flex-1 basis-40 text-[12px] leading-tight">
                        {ae.nombre.length > 72
                          ? `${ae.nombre.slice(0, 72)}…`
                          : ae.nombre}
                      </span>
                      <span className="ml-auto flex items-center gap-[10px]">
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
                      </span>
                    </div>
                    <DataTable
                      sinCabecera
                      celdaClassName="px-[11px] py-2"
                      columnas={[
                        {
                          key: "codigo",
                          header: "Código",
                          movil: "clave",
                          thClassName: "w-[56px]",
                          cell: (i) => (
                            <Link
                              href={`/indicadores/${i.codigo}?anio=${anio}`}
                              className="font-serif font-semibold text-azul-d hover:underline"
                            >
                              {i.codigo}
                            </Link>
                          ),
                        },
                        {
                          key: "nombre",
                          header: "Indicador",
                          movil: "titulo",
                          tdClassName: "text-[12.5px]",
                          cell: (i) =>
                            i.nombre.length > 90
                              ? `${i.nombre.slice(0, 90)}…`
                              : i.nombre,
                        },
                        {
                          key: "cumplimiento",
                          header: "Cumpl.",
                          align: "right",
                          tnum: true,
                          thClassName: "w-[60px]",
                          tdClassName: "text-[12.5px]",
                          cell: (i) => fmtPct(i.capado),
                        },
                        {
                          key: "semaforo",
                          header: "Semáforo",
                          movil: "insignia",
                          thClassName: "w-[110px]",
                          cell: (i) => <SemPill sem={i.semaforo} />,
                        },
                      ]}
                      filas={ae.indicadores}
                      keyFila={(i) => i.codigo}
                      vacio="Sin indicadores."
                    />
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
