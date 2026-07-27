"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AEEstadoDTO, EstadoPeiDTO } from "@/shared/dtos/estado-pei";
import { SemPill } from "@/ui/components/sem-pill";
import { Card, CardHeader, Tag } from "@/ui/components/card";
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
    <div className="grid grid-cols-[310px_1fr] items-start gap-4 max-[1000px]:grid-cols-1">
      <Card>
        <CardHeader
          title="Acciones por objetivo"
          meta={`${todasAE.length} acciones`}
        />
        <div className="scroll-pj max-h-[660px] overflow-y-auto">
          {estado.objetivos.map((oe) => (
            <div key={oe.codigo}>
              <div className="sticky top-0 border-b border-linea-2 bg-[#FAFBFC] px-[14px] pb-[5px] pt-2 text-[10px] uppercase tracking-[.08em] text-muted-2">
                {oe.codigo} · {oe.nombre.slice(0, 52)}…
              </div>
              {oe.acciones.map((a) => (
                <button
                  key={a.codigo}
                  type="button"
                  onClick={() => setSel(a.codigo)}
                  className={cn(
                    "block w-full border-b border-linea-2 px-[14px] py-[10px] text-left hover:bg-[#F7F9FB]",
                    a.codigo === sel &&
                      "bg-azul-soft shadow-[inset_3px_0_0_#1E6FA8]",
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
              <div className="my-1 font-serif text-[21px] text-azul-d">
                {ae.codigo}
              </div>
              <p className="mb-[14px] text-[13px] leading-[1.45]">{ae.nombre}</p>

              <div className="mb-[14px] grid grid-cols-4 gap-3 max-[800px]:grid-cols-2">
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

              <table className="w-full">
                <thead>
                  <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                    <th className="border-b border-linea px-3 py-2">Código</th>
                    <th className="border-b border-linea px-3 py-2">Indicador</th>
                    <th className="border-b border-linea px-3 py-2 text-right">
                      Cumpl.
                    </th>
                    <th className="border-b border-linea px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ae.indicadores.map((i) => (
                    <tr key={i.codigo} className="hover:bg-azul-soft">
                      <td className="border-b border-linea-2 px-3 py-2">
                        <Link
                          href={`/indicadores/${i.codigo}?anio=${estado.anio}`}
                          className="font-serif font-semibold text-azul-d hover:underline"
                        >
                          {i.codigo}
                        </Link>
                      </td>
                      <td className="border-b border-linea-2 px-3 py-2 text-[12.5px]">
                        {i.nombre}{" "}
                        {i.requiereDiagnostico ? (
                          <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] border border-[#DDCBEC] bg-[#EFE7F5] px-[7px] text-[10px] font-semibold text-[#6b3fa0]">
                            requiere diagnóstico
                          </span>
                        ) : null}
                      </td>
                      <td className="tnum border-b border-linea-2 px-3 py-2 text-right">
                        {fmtPct(i.capado)}
                      </td>
                      <td className="border-b border-linea-2 px-3 py-2">
                        <SemPill sem={i.semaforo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      <div className="mt-[5px] font-serif text-[22px]" style={{ color }}>
        {valor}
      </div>
    </div>
  );
}
