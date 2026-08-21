import { cn } from "@/lib/utils";

/**
 * Marco tipo "ventana" para maquetas ilustrativas de la interfaz.
 * Las maquetas se construyen con los componentes reales del design system
 * (no capturas de pantalla): nunca envejecen respecto de la UI.
 */
export function Maqueta({
  titulo,
  children,
  className,
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-hidden rounded-pj border border-linea shadow-card print:break-inside-avoid">
      <div className="flex items-center gap-2 border-b border-linea bg-[#F0F3F6] px-3 py-[7px]">
        <span className="flex gap-[5px]" aria-hidden="true">
          <span className="h-[9px] w-[9px] rounded-full bg-[#D3DAE1]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#D3DAE1]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#D3DAE1]" />
        </span>
        {titulo ? (
          <span className="text-[10.5px] uppercase tracking-[.08em] text-muted-2">
            {titulo}
          </span>
        ) : null}
      </div>
      <div className={cn("bg-superficie p-4", className)}>{children}</div>
    </div>
  );
}
