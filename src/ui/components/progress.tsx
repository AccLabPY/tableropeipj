import { SEM_COLORS } from "@/ui/theme/tokens";
import type { Semaforo } from "@/domain/types";
import { cn } from "@/lib/utils";

/** Barra de progreso coloreada por semáforo (fracción 0..1). */
export function ProgressBar({
  frac,
  sem,
  alto = "h-2",
}: {
  frac: number | null;
  sem: Semaforo;
  alto?: string;
}) {
  const pct = frac === null ? 0 : Math.round(Math.max(0, Math.min(1, frac)) * 100);
  return (
    <div
      className={cn("overflow-hidden rounded-pj-sm bg-linea agentes:rounded-chip", alto)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-pj-sm agentes:rounded-chip"
        style={{ width: `${pct}%`, background: SEM_COLORS[sem] }}
      />
    </div>
  );
}
