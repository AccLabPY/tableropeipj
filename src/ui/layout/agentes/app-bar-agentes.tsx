import { Clock } from "../clock";
import { LogoAgentes } from "@/ui/brand/logo-agentes";

/**
 * Barra superior del tema Agentes PEI: gradiente de marca, logo del
 * programa y chip naranja del plan. Misma API que AppBar (left / children).
 */
export function AppBarAgentes({
  left,
  children,
}: {
  left?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-marca text-white shadow-[0_2px_12px_rgba(11,104,177,.25)]">
      <div className="mx-auto flex max-w-pj items-center gap-2 px-3 py-[9px] xs:gap-3 sm:gap-4 sm:px-[22px] sm:py-[11px]">
        {left}
        <div className="flex min-w-0 items-center gap-2 xs:gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-white/95 p-[5px] shadow-sm sm:h-10 sm:w-10">
            <LogoAgentes className="h-full w-full" />
          </span>
          <div className="min-w-0 leading-[1.1]">
            <div className="truncate font-serif text-[14px] font-bold tracking-tight sm:text-[15.5px]">
              Agentes PEI
            </div>
            <div className="truncate text-[9.5px] font-medium uppercase tracking-[.14em] text-white/80 sm:text-[10px]">
              {/* En móvil el nombre completo se cortaba: sigla institucional. */}
              <span className="sm:hidden">PJ · CSJ</span>
              <span className="hidden sm:inline">Poder Judicial del Paraguay</span>
            </div>
          </div>
        </div>
        <span className="flex-1" />
        <span className="hidden text-white/85 xl:inline">
          <Clock />
        </span>
        {children}
      </div>
    </header>
  );
}
