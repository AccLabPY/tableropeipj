"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { SEMAFORO_LABEL } from "@/domain/semaforo";
import type { Semaforo } from "@/domain/types";

/** Donut de distribución del semáforo (client-only, se monta con dynamic). */
export function DonutSemaforo({
  distribucion,
}: {
  distribucion: Record<Semaforo, number>;
}) {
  const data = (Object.keys(distribucion) as Semaforo[]).map((s) => ({
    name: SEMAFORO_LABEL[s],
    value: distribucion[s],
    color: SEM_COLORS[s],
  }));
  return (
    <div className="h-[180px] sm:h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="95%"
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [`${v} indicadores`, n]}
            contentStyle={{ fontSize: 12, borderRadius: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
