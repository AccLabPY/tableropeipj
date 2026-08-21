import { cn } from "@/lib/utils";

/** Bloque de skeleton (pulso) para estados de carga. */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-pj bg-linea-2", className)}
    />
  );
}

/** Card de skeleton con el marco real de las tarjetas. */
export function EsqueletoCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-pj border border-linea bg-superficie shadow-card",
        className,
      )}
    />
  );
}

/** Encabezado de página en carga (título + subtítulo + regla). */
export function EsqueletoHeader() {
  return (
    <div aria-hidden="true">
      <Esqueleto className="h-[26px] w-full max-w-64" />
      <Esqueleto className="mt-2 h-[14px] w-full max-w-96" />
      <div className="mb-5 mt-[14px] h-px bg-linea" />
    </div>
  );
}
