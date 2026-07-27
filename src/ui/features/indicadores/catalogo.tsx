"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EstadoPeiDTO } from "@/shared/dtos/estado-pei";
import type { Semaforo } from "@/domain/types";
import { Card, Tag } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtNum, fmtPct, fmtValor } from "@/lib/utils";

/** Catálogo filtrable de los 89 indicadores (filtros client-side). */
export function CatalogoIndicadores({ estado }: { estado: EstadoPeiDTO }) {
  const [oe, setOe] = useState("");
  const [sem, setSem] = useState<"" | Semaforo>("");
  const [q, setQ] = useState("");

  const filas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return estado.indicadores.filter(
      (i) =>
        (!oe || i.oeCodigo === oe) &&
        (!sem || i.semaforo === sem) &&
        (!term ||
          String(i.codigo).includes(term) ||
          i.nombre.toLowerCase().includes(term)),
    );
  }, [estado, oe, sem, q]);

  return (
    <>
      <div className="mb-[14px] flex flex-wrap items-end gap-[10px]">
        <label className="text-2xs uppercase tracking-[.06em] text-muted">
          Objetivo
          <select
            value={oe}
            onChange={(e) => setOe(e.target.value)}
            className="mt-1 block rounded-pj border border-linea bg-superficie px-2 py-[7px] text-[12.5px] normal-case tracking-normal text-tinta"
          >
            <option value="">Todos los OE</option>
            {estado.objetivos.map((o) => (
              <option key={o.codigo} value={o.codigo}>
                {o.codigo}
              </option>
            ))}
          </select>
        </label>
        <label className="text-2xs uppercase tracking-[.06em] text-muted">
          Estado
          <select
            value={sem}
            onChange={(e) => setSem(e.target.value as "" | Semaforo)}
            className="mt-1 block rounded-pj border border-linea bg-superficie px-2 py-[7px] text-[12.5px] normal-case tracking-normal text-tinta"
          >
            <option value="">Todos</option>
            <option value="VERDE">En meta</option>
            <option value="AMARILLO">En riesgo</option>
            <option value="ROJO">Crítico</option>
            <option value="GRIS">Pendiente</option>
          </select>
        </label>
        <label className="min-w-[180px] flex-1 text-2xs uppercase tracking-[.06em] text-muted">
          Buscar
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código o nombre del indicador…"
            className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-[7px] text-[12.5px] normal-case tracking-normal text-tinta"
          />
        </label>
        <span className="pb-[9px] text-[11px] text-muted">
          {filas.length} de {estado.indicadores.length}
        </span>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                <th className="border-b border-linea px-3 py-[9px]">Código</th>
                <th className="border-b border-linea px-3 py-[9px]">Indicador</th>
                <th className="border-b border-linea px-3 py-[9px]">OE</th>
                <th className="hidden border-b border-linea px-3 py-[9px] lg:table-cell">Unidad</th>
                <th className="hidden border-b border-linea px-3 py-[9px] lg:table-cell">Sentido</th>
                <th className="hidden border-b border-linea px-3 py-[9px] text-right md:table-cell">
                  Base
                </th>
                <th className="hidden border-b border-linea px-3 py-[9px] text-right sm:table-cell">
                  Meta {estado.anio}
                </th>
                <th className="hidden border-b border-linea px-3 py-[9px] text-right sm:table-cell">
                  Aprobado
                </th>
                <th className="border-b border-linea px-3 py-[9px]">Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((i) => (
                <tr key={i.codigo} className="hover:bg-azul-soft">
                  <td className="border-b border-linea-2 px-3 py-[10px]">
                    <Link
                      href={`/indicadores/${i.codigo}?anio=${estado.anio}`}
                      className="font-serif font-semibold text-azul-d hover:underline"
                    >
                      {i.codigo}
                    </Link>
                  </td>
                  <td className="border-b border-linea-2 px-3 py-[10px] text-[12.5px]">
                    {i.nombre}
                    <div className="mt-[2px] text-[11px] text-muted-2">
                      {i.aeCodigo ?? "Nivel OE"} · {i.dependenciaPrincipal}
                      {i.requiereDiagnostico ? " · requiere diagnóstico" : ""}
                    </div>
                  </td>
                  <td className="border-b border-linea-2 px-3 py-[10px]">
                    <Tag>{i.oeCodigo}</Tag>
                  </td>
                  <td className="hidden border-b border-linea-2 px-3 py-[10px] text-[12px] text-muted lg:table-cell">
                    {i.unidad === "PORCENTAJE"
                      ? "%"
                      : i.unidad === "NUMERO"
                        ? "Número"
                        : i.unidad === "PUNTAJE"
                          ? "Puntaje"
                          : "Índice"}
                  </td>
                  <td className="hidden border-b border-linea-2 px-3 py-[10px] text-[12px] lg:table-cell">
                    {i.sentido === "ASC" ? "↑ Asc." : "↓ Desc."}
                  </td>
                  <td className="tnum hidden border-b border-linea-2 px-3 py-[10px] text-right md:table-cell">
                    {i.basePendiente ? (
                      <span className="text-muted-2">a determinar</span>
                    ) : (
                      fmtNum(i.lineaBase)
                    )}
                  </td>
                  <td className="tnum hidden border-b border-linea-2 px-3 py-[10px] text-right sm:table-cell">
                    {i.metaConcluida ? (
                      <span className="text-muted-2">concluido</span>
                    ) : (
                      fmtValor(i.meta, i.unidad)
                    )}
                  </td>
                  <td className="tnum hidden border-b border-linea-2 px-3 py-[10px] text-right sm:table-cell">
                    {fmtValor(i.valor, i.unidad)}
                  </td>
                  <td className="border-b border-linea-2 px-3 py-[10px]">
                    <SemPill
                      sem={i.semaforo}
                      pct={i.capado !== null ? i.capado : undefined}
                    />
                  </td>
                </tr>
              ))}
              {filas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted">
                    Sin indicadores para el filtro seleccionado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-muted">
        {(["VERDE", "AMARILLO", "ROJO", "GRIS"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-[6px]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: SEM_COLORS[s] }}
            />
            {
              {
                VERDE: `En meta ≥${Math.round((estado.indicadores[0]?.umbralVerde ?? 0.9) * 100)}%`,
                AMARILLO: "En riesgo",
                ROJO: "Crítico",
                GRIS: "Pendiente / sin dato",
              }[s]
            }
          </span>
        ))}
        <span>{fmtPct(estado.cobertura.fraccion)} de cobertura de reporte</span>
      </div>
    </>
  );
}
