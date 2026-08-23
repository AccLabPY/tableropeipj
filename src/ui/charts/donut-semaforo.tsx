"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, SEM_COLORS } from "@/ui/theme/tokens";
import { SEMAFORO_LABEL } from "@/domain/semaforo";
import type { Semaforo } from "@/domain/types";

/**
 * Donut de distribución del semáforo (client-only, se monta con dynamic).
 * `fijo`: dimensiones en px fijas y sin animación/tooltip — para los
 * reportes imprimibles (ResponsiveContainer colapsa en print).
 */
export function DonutSemaforo({
  distribucion,
  fijo = false,
}: {
  distribucion: Record<Semaforo, number>;
  fijo?: boolean;
}) {
  const data = (Object.keys(distribucion) as Semaforo[]).map((s) => ({
    name: SEMAFORO_LABEL[s],
    value: distribucion[s],
    color: SEM_COLORS[s],
  }));

  const pie = (
    <Pie
      data={data}
      dataKey="value"
      nameKey="name"
      innerRadius="64%"
      outerRadius="95%"
      strokeWidth={2}
      stroke={COLORS.superficie}
      isAnimationActive={!fijo}
    >
      {data.map((d) => (
        <Cell key={d.name} fill={d.color} />
      ))}
    </Pie>
  );

  if (fijo) {
    return (
      <PieChart width={260} height={200}>
        {pie}
      </PieChart>
    );
  }

  return (
    <div className="h-[180px] sm:h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {pie}
          <Tooltip
            formatter={(v: number, n: string) => [`${v} indicadores`, n]}
            contentStyle={{ fontSize: 12, borderRadius: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
