import { cn, fmtPct } from "@/lib/utils";
import { SEMAFORO_LABEL } from "@/domain/semaforo";
import type { Semaforo } from "@/domain/types";

const CLASES: Record<Semaforo, string> = {
  VERDE: "bg-sem-verde-bg text-sem-verde-fg",
  AMARILLO: "bg-sem-ambar-bg text-sem-ambar-fg",
  ROJO: "bg-sem-rojo-bg text-sem-rojo-fg",
  GRIS: "bg-sem-gris-bg text-muted",
};
const PUNTOS: Record<Semaforo, string> = {
  VERDE: "bg-sem-verde",
  AMARILLO: "bg-sem-ambar",
  ROJO: "bg-sem-rojo",
  GRIS: "bg-sem-gris",
};

/** Pill de semáforo de cumplimiento (§10). */
export function SemPill({
  sem,
  pct,
  grande,
}: {
  sem: Semaforo;
  pct?: number | null;
  grande?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] whitespace-nowrap rounded-pj-sm font-semibold agentes:rounded-chip",
        grande ? "px-3 py-[6px] text-[14px]" : "px-2 py-[3px] text-[11.5px]",
        CLASES[sem],
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full", PUNTOS[sem])}
        aria-hidden="true"
      />
      {SEMAFORO_LABEL[sem]}
      {pct !== undefined && pct !== null ? ` · ${fmtPct(pct)}` : ""}
    </span>
  );
}
