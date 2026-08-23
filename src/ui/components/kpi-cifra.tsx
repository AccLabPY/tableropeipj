"use client";

import { Contador } from "@/ui/motion/contador";
import { fmtPct } from "@/lib/utils";

/**
 * Cifra grande de una tarjeta KPI. En el tema Agentes "sube" animada desde 0
 * (ver Contador); en Clásico o con reduced-motion muestra el valor directo.
 * `formato`: "pct" (fracción 0–1 → "85%") o "entero".
 */
export function KpiCifra({
  valor,
  formato = "entero",
}: {
  valor: number | null;
  formato?: "pct" | "entero";
}) {
  const formatear =
    formato === "pct"
      ? (v: number | null) => fmtPct(v)
      : (v: number | null) => (v === null ? "—" : String(Math.round(v)));
  return <Contador valor={valor} formatear={formatear} />;
}
