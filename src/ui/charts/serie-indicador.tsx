"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, META_SERIES_COLOR } from "@/ui/theme/tokens";
import type { TrayectoriaAnioDTO } from "@/shared/dtos/indicador-ficha";
import { fmtNum } from "@/lib/utils";

/**
 * Avance en el tiempo: línea base + metas 2026-2030 (punteada, connectNulls)
 * vs valores reportados (puntos, sin spanGaps). Maneja base pendiente.
 */
export function SerieIndicador({
  trayectoria,
  lineaBase,
  unidad,
  fijo = false,
}: {
  trayectoria: TrayectoriaAnioDTO[];
  lineaBase: number | null;
  unidad: string;
  /** Dimensiones fijas en px (reportes imprimibles). */
  fijo?: boolean;
}) {
  const sufijo = unidad === "PORCENTAJE" ? "%" : "";
  const data = [
    ...(lineaBase !== null
      ? [{ label: "Base", meta: lineaBase, valor: lineaBase }]
      : []),
    ...trayectoria.map((t) => ({
      label: String(t.anio),
      meta: t.metaConcluida ? null : t.meta,
      valor: t.valor,
    })),
  ];
  const grafico = (dim?: { width: number; height: number }) => (
    <LineChart
      data={data}
      margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
      {...dim}
    >
      <CartesianGrid stroke={COLORS.linea2} vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
      <YAxis
        tick={{ fontSize: 11 }}
        tickLine={false}
        axisLine={false}
        domain={["auto", "auto"]}
      />
      {!fijo ? (
        <Tooltip
          formatter={(v: number, name: string) => [
            `${fmtNum(v)}${sufijo}`,
            name === "meta" ? "Meta planificada" : "Reportado",
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 4 }}
        />
      ) : null}
      <Line
        dataKey="meta"
        stroke={META_SERIES_COLOR}
        strokeDasharray="5 4"
        dot={{ r: 3 }}
        connectNulls
        isAnimationActive={false}
      />
      <Line
        dataKey="valor"
        stroke={COLORS.azul}
        strokeWidth={2}
        dot={{ r: 5 }}
        activeDot={{ r: 6 }}
        connectNulls={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
  if (fijo) {
    return (
      <div>
        {grafico({ width: 640, height: 240 })}
        <Leyenda />
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-[220px] flex-col sm:min-h-[280px]">
      <div className="min-h-[190px] flex-1 sm:min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {grafico()}
        </ResponsiveContainer>
      </div>
      <Leyenda />
    </div>
  );
}

function Leyenda() {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-muted">
      <span className="inline-flex items-center gap-[6px]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: META_SERIES_COLOR }}
        />
        Meta planificada
      </span>
      <span className="inline-flex items-center gap-[6px]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: COLORS.azul }}
        />
        Reportado
      </span>
    </div>
  );
}
