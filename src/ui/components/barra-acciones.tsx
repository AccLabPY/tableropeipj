import { cn } from "@/lib/utils";

/**
 * Fila de acciones de una cabecera de página. En móvil las acciones se
 * alinean a la derecha y comparten una sola línea (con scroll horizontal
 * propio si no entran), de modo que nunca rompan la grilla del encabezado.
 */
export function BarraAcciones({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scroll-pj -mx-1 flex min-w-0 max-w-full items-center justify-end gap-2 overflow-x-auto px-1 py-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
