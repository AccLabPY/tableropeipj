"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { EstadoPeiDTO } from "@/shared/dtos/estado-pei";
import type { Semaforo } from "@/domain/types";
import { Card, Tag } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { DataTable, type Columna } from "@/ui/components/data-table";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtNum, fmtPct, fmtValor } from "@/lib/utils";

type FilaIndicador = EstadoPeiDTO["indicadores"][number];

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

  const columnas: Columna<FilaIndicador>[] = [
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
          {i.nombre}
          <div className="mt-[2px] text-[11px] text-muted-2">
            {i.aeCodigo ?? "Nivel OE"} · {i.dependenciaPrincipal}
            {i.requiereDiagnostico ? " · requiere diagnóstico" : ""}
          </div>
        </>
      ),
    },
    {
      key: "oe",
      header: "OE",
      cell: (i) => <Tag>{i.oeCodigo}</Tag>,
    },
    {
      key: "unidad",
      header: "Unidad",
      desde: "xl",
      tdClassName: "text-[12px] text-muted",
      cell: (i) =>
        i.unidad === "PORCENTAJE"
          ? "%"
          : i.unidad === "NUMERO"
            ? "Número"
            : i.unidad === "PUNTAJE"
              ? "Puntaje"
              : "Índice",
    },
    {
      key: "sentido",
      header: "Sentido",
      desde: "xl",
      tdClassName: "text-[12px]",
      cell: (i) => (i.sentido === "ASC" ? "↑ Asc." : "↓ Desc."),
    },
    {
      key: "base",
      header: "Base",
      align: "right",
      tnum: true,
      desde: "lg",
      cell: (i) =>
        i.basePendiente ? (
          <span className="text-muted-2">a determinar</span>
        ) : (
          fmtNum(i.lineaBase)
        ),
    },
    {
      key: "meta",
      header: `Meta ${estado.anio}`,
      align: "right",
      tnum: true,
      cell: (i) =>
        i.metaConcluida ? (
          <span className="text-muted-2">concluido</span>
        ) : (
          fmtValor(i.meta, i.unidad)
        ),
    },
    {
      key: "aprobado",
      header: "Aprobado",
      align: "right",
      tnum: true,
      cell: (i) => fmtValor(i.valor, i.unidad),
    },
    {
      key: "semaforo",
      header: "Semáforo",
      movil: "insignia",
      cell: (i) => (
        <SemPill
          sem={i.semaforo}
          pct={i.capado !== null ? i.capado : undefined}
        />
      ),
    },
  ];

  return (
    <>
      <div className="mb-[14px] flex flex-wrap items-end gap-[10px]">
        <label className="text-2xs uppercase tracking-[.06em] text-muted">
          Objetivo
          <select
            value={oe}
            onChange={(e) => setOe(e.target.value)}
            className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-[7px] text-[12.5px] normal-case tracking-normal text-tinta"
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
            className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-[7px] text-[12.5px] normal-case tracking-normal text-tinta"
          >
            <option value="">Todos</option>
            <option value="VERDE">En meta</option>
            <option value="AMARILLO">En riesgo</option>
            <option value="ROJO">Crítico</option>
            <option value="GRIS">Pendiente</option>
          </select>
        </label>
        <label className="w-full text-2xs uppercase tracking-[.06em] text-muted xs:min-w-[180px] xs:flex-1">
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
        <DataTable
          columnas={columnas}
          filas={filas}
          keyFila={(i) => i.codigo}
          vacio="Sin indicadores para el filtro seleccionado."
        />
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
