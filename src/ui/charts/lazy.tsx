"use client";

import dynamic from "next/dynamic";

/**
 * Wrappers client-only de Recharts (evitan SSR/hidratación §riesgos):
 * los Server Components importan estos y pasan solo DTOs planos.
 */
function SkeletonChart({ h }: { h: number }) {
  return (
    <div
      className="animate-pulse rounded-pj bg-linea-2"
      style={{ height: h }}
      aria-hidden="true"
    />
  );
}

export const LazyDonutSemaforo = dynamic(
  () => import("./donut-semaforo").then((m) => m.DonutSemaforo),
  { ssr: false, loading: () => <SkeletonChart h={210} /> },
);

export const LazySerieIndicador = dynamic(
  () => import("./serie-indicador").then((m) => m.SerieIndicador),
  { ssr: false, loading: () => <SkeletonChart h={280} /> },
);
