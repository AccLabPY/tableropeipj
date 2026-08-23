import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const ESTILOS = {
  info: {
    cls: "border-azul-line bg-azul-soft text-azul-d",
    Icono: Info,
    label: "Información",
  },
  advertencia: {
    cls: "border-sem-ambar-border bg-sem-ambar-bg text-sem-ambar-fg",
    Icono: TriangleAlert,
    label: "Atención",
  },
  tip: {
    cls: "border-sem-verde-border bg-sem-verde-bg text-sem-verde-fg",
    Icono: Lightbulb,
    label: "Consejo",
  },
} as const;

/** Recuadro de nota dentro de una guía: info / advertencia / tip. */
export function Callout({
  tipo = "info",
  children,
}: {
  tipo?: keyof typeof ESTILOS;
  children: React.ReactNode;
}) {
  const e = ESTILOS[tipo];
  return (
    <div
      className={cn(
        "flex gap-[10px] rounded-pj border px-3 py-[10px] text-[12.5px] leading-relaxed print:break-inside-avoid",
        e.cls,
      )}
    >
      <e.Icono className="mt-[2px] h-4 w-4 flex-none" aria-label={e.label} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
