import { Clock } from "./clock";

/** Emblema de balanza (SVG del prototipo). */
function Crest() {
  return (
    <div
      aria-hidden="true"
      className="grid h-[38px] w-[38px] flex-none place-items-center rounded-pj-sm border-[1.5px] border-white/55"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[22px] w-[22px]"
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

export function AppBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b-[3px] border-azul bg-navy text-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-[18px] px-[22px] py-3">
        <div className="flex items-center gap-3">
          <Crest />
          <div className="leading-[1.1]">
            <div className="font-serif text-[15px] tracking-wide">
              Poder Judicial del Paraguay
            </div>
            <div className="text-[10.5px] uppercase tracking-[.16em] text-[#B8CADA]">
              Corte Suprema de Justicia
            </div>
          </div>
        </div>
        <span className="flex-1" />
        <Clock />
        <span className="rounded-pj-sm border border-white/[.18] bg-white/10 px-[10px] py-1 text-[11px] tracking-wider">
          PEI 2026–2030
        </span>
        {children}
      </div>
    </header>
  );
}
