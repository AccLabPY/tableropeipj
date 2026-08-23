import type { EstadoWF } from "@/domain/types";

/** Etiqueta + clases del chip por estado de workflow (compartido). */
export const WF_CHIP: Record<
  EstadoWF | "SIN_CARGA" | "PENDIENTE",
  { label: string; cls: string }
> = {
  SIN_CARGA: { label: "Sin carga", cls: "bg-sem-gris-bg text-muted" },
  PENDIENTE: { label: "Pendiente", cls: "bg-sem-gris-bg text-muted" },
  BORRADOR: { label: "Borrador", cls: "bg-sem-ambar-bg text-sem-ambar-fg" },
  ENVIADO: { label: "Enviado", cls: "bg-azul-soft text-azul-d" },
  EN_REVISION: { label: "En revisión", cls: "bg-azul-soft text-azul-d" },
  OBSERVADO: { label: "Observado", cls: "bg-sem-ambar-bg text-sem-ambar-fg" },
  APROBADO: { label: "Aprobado", cls: "bg-sem-verde-bg text-sem-verde-fg" },
  RECHAZADO: { label: "Rechazado", cls: "bg-sem-rojo-bg text-sem-rojo-fg" },
  RECTIFICADO: { label: "Rectificado", cls: "bg-sem-gris-bg text-muted" },
};

/** Chip visual de estado de workflow de una medición. */
export function ChipWorkflow({
  estado,
}: {
  estado: EstadoWF | "SIN_CARGA" | "PENDIENTE";
}) {
  const c = WF_CHIP[estado];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-chip px-[7px] py-[1px] text-[10px] font-semibold ${c.cls}`}
    >
      {c.label}
    </span>
  );
}
