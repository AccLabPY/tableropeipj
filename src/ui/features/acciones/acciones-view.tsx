"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AEEstadoDTO, EstadoPeiDTO } from "@/shared/dtos/estado-pei";
import { SemPill } from "@/ui/components/sem-pill";
import { Card, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { cn, fmtPct } from "@/lib/utils";

/** Vista master–detail de las 39 Acciones Estratégicas agrupadas por OE. */
export function AccionesView({ estado }: { estado: EstadoPeiDTO }) {
  const todasAE = useMemo(
    () => estado.objetivos.flatMap((oe) => oe.acciones),
    [estado],
  );
  const [sel, setSel] = useState<string>(todasAE[0]?.codigo ?? "");
  const ae: AEEstadoDTO | undefined = todasAE.find((a) => a.codigo === sel);
  const oeDe = (codigo: string) =>
    estado.objetivos.find((o) => o.acciones.some((a) => a.codigo === codigo));

  const dist = useMemo(() => {
    const d = { VERDE: 0, AMARILLO: 0, ROJO: 0, GRIS: 0 };
    ae?.indicadores.forEach((i) => d[i.semaforo]++);
    return d;
  }, [ae]);

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[270px_1fr] lg:grid-cols-[310px_1fr]">
      <Card>
        <CardHeader
          title="Acciones por objetivo"
          meta={`${todasAE.length} acciones`}
        />
        <div className="scroll-pj max-h-[320px] overflow-y-auto md:max-h-[660px]">
          {estado.objetivos.map((oe) => (
            <div key={oe.codigo}>
              <div className="sticky top-0 border-b border-linea-2 bg-zebra px-[14px] pb-[5px] pt-2 text-[10px] uppercase tracking-[.08em] text-muted-2">
                {oe.codigo} · {oe.nombre.slice(0, 52)}…
              </div>
              {oe.acciones.map((a) => (
                <button
                  key={a.codigo}
                  type="button"
                  onClick={() => setSel(a.codigo)}
                  className={cn(
                    "block w-full border-b border-linea-2 px-[14px] py-[10px] text-left hover:bg-hover",
                    a.codigo === sel &&
                      "bg-azul-soft shadow-[inset_3px_0_0_rgb(var(--c-azul))]",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-serif text-[12.5px] font-semibold text-azul-d">
                      {a.codigo}
                    </span>
                    <span className="text-[10.5px] text-muted-2">
                      {a.indicadores.length} ind.
                    </span>
                  </span>
                  <span className="mt-[3px] block text-[11.5px] leading-tight">
                    {a.nombre.length > 64 ? `${a.nombre.slice(0, 64)}…` : a.nombre}
                  </span>
                  <span className="mt-[7px] flex items-center gap-[7px]">
                    <span className="h-[5px] flex-1 overflow-hidden rounded bg-linea">
                      <span
                        className="block h-full"
                        style={{
                          width: `${Math.round((a.avance ?? 0) * 100)}%`,
                          background: SEM_COLORS[a.semaforo],
                        }}
                      />
                    </span>
                    <span
                      className="tnum text-[11px] font-semibold"
                      style={{ color: SEM_COLORS[a.semaforo] }}
                    >
                      {fmtPct(a.avance)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="p-4">
          {ae ? (
            <>
              <div className="text-[11px] text-muted">
                {oeDe(ae.codigo)?.codigo} · {oeDe(ae.codigo)?.nombre}
              </div>
              <div className="my-1 font-serif text-titulo text-azul-d">
                {ae.codigo}
              </div>
              <p className="mb-[14px] text-[13px] leading-[1.45]">{ae.nombre}</p>

              <div className="mb-[14px] grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
                <Stat label="Indicadores" valor={String(ae.indicadores.length)} />
                <Stat
                  label="Avance agregado"
                  valor={fmtPct(ae.avance)}
                  color={SEM_COLORS[ae.semaforo]}
                />
                <Stat
                  label="Con dato aprobado"
                  valor={`${ae.indicadores.filter((i) => i.valor !== null).length}/${ae.indicadores.length}`}
                />
                <Stat
                  label="Requieren diagnóstico"
                  valor={String(
                    ae.indicadores.filter((i) => i.requiereDiagnostico).length,
                  )}
                />
              </div>

              <div className="mb-3 flex flex-wrap gap-[14px] text-[11.5px] text-muted">
                {(["VERDE", "AMARILLO", "ROJO", "GRIS"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-[6px]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: SEM_COLORS[s] }}
                    />
                    {
                      {
                        VERDE: "En meta",
                        AMARILLO: "En riesgo",
                        ROJO: "Crítico",
                        GRIS: "Pend./sin dato",
                      }[s]
                    }{" "}
                    {dist[s]}
                  </span>
                ))}
              </div>

              <DataTable
                celdaClassName="px-3 py-2"
                columnas={[
                  {
                    key: "codigo",
                    header: "Código",
                    movil: "clave",
                    cell: (i) => (
                      <Link
                        href={`/indicadores/${i.codigo}?anio=${estado.anio}`}
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
                    cell: (i) => (
                      <>
                        {i.nombre}{" "}
                        {i.requiereDiagnostico ? (
                          <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-chip border border-purpura-border bg-purpura-bg px-[7px] text-[10px] font-semibold text-purpura">
                            requiere diagnóstico
                          </span>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    key: "cumplimiento",
                    header: "Cumpl.",
                    align: "right",
                    tnum: true,
                    cell: (i) => fmtPct(i.capado),
                  },
                  {
                    key: "estado",
                    header: "Estado",
                    movil: "insignia",
                    cell: (i) => <SemPill sem={i.semaforo} />,
                  },
                ]}
                filas={ae.indicadores}
                keyFila={(i) => i.codigo}
                vacio="Esta acción no tiene indicadores asociados."
              />
            </>
          ) : (
            <div className="p-4 text-muted">
              <Tag>Seleccione una acción estratégica</Tag>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  valor,
  color,
}: {
  label: string;
  valor: string;
  color?: string;
}) {
  return (
    <div className="rounded-pj border border-linea bg-superficie px-[13px] py-[11px]">
      <div className="text-[10px] uppercase tracking-[.05em] text-muted">
        {label}
      </div>
      <div className="mt-[5px] font-serif text-titulo" style={{ color }}>
        {valor}
      </div>
    </div>
  );
}
