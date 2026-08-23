import { Clock } from "./clock";

/** Emblema de balanza (SVG del prototipo). */
function Crest() {
  return (
    <div
      aria-hidden="true"
      className="grid h-[34px] w-[34px] flex-none place-items-center rounded-pj-sm border-[1.5px] border-white/55 sm:h-[38px] sm:w-[38px]"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]"
      >
        <path d="M12 3v16" />
        <path d="M6 20h12" />
        <path d="M4 8h16" />
        <path d="M4 8l-2 5a3 3 0 0 0 6 0z" />
        <path d="M20 8l-2 5a3 3 0 0 0 6 0z" />
      </svg>
    </div>
  );
}

/**
 * Barra institucional. `left` (hamburguesa móvil) va antes de la marca;
 * `children` (menú de usuario) al final. El reloj y el badge del plan se
 * ocultan progresivamente en pantallas chicas.
 */
export function AppBar({
  left,
  children,
}: {
  left?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b-[3px] border-azul bg-navy text-white">
      <div className="mx-auto flex max-w-pj items-center gap-2 px-3 py-[10px] xs:gap-3 sm:gap-[18px] sm:px-[22px] sm:py-3">
        {left}
        <div className="flex min-w-0 items-center gap-2 xs:gap-3">
          <Crest />
          <div className="min-w-0 leading-[1.1]">
            <div className="truncate font-serif text-[13.5px] tracking-wide sm:text-[15px]">
              Poder Judicial del Paraguay
            </div>
            <div className="truncate text-[9.5px] uppercase tracking-[.16em] text-on-marca sm:text-[10.5px]">
              Corte Suprema de Justicia
            </div>
          </div>
        </div>
        <span className="flex-1" />
        <span className="hidden xl:inline">
          <Clock />
        </span>
        {children}
      </div>
    </header>
  );
}
