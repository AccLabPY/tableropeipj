import Image from "next/image";

/**
 * Pie institucional. Bookend visual del AppBar (mismo navy + acento azul):
 * columna izquierda alineada con el ancho de la Sidebar (224px), columna
 * derecha alineada con el main — separadas por el mismo tipo de borde que
 * usa la Sidebar para su límite derecho.
 */
export function Footer() {
  return (
    <footer className="border-t-[3px] border-azul bg-navy text-white">
      <div className="mx-auto grid w-full max-w-pj grid-cols-1 gap-5 px-3 py-7 xs:px-4 sm:px-[26px] sm:py-8 lg:grid-cols-[224px_1fr] lg:gap-0">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/logo-csj.png"
            alt="Corte Suprema de Justicia"
            width={140}
            height={140}
            className="h-12 w-12 flex-none"
          />
          <div className="font-serif text-[13.5px] tracking-wide">
            Poder Judicial del Paraguay
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="max-w-md text-[11.5px] leading-relaxed text-[#B8CADA]">
            Plataforma de Seguimiento del Plan Estratégico Institucional
            2026–2030, desarrollada con el apoyo técnico del Programa de las
            Naciones Unidas para el Desarrollo.
          </p>
          <div className="flex flex-none items-center gap-4">
            <span className="text-[11px] uppercase leading-tight tracking-[.12em] text-[#B8CADA]">
              Con el
              <br />
              apoyo de
            </span>
            <Image
              src="/brand/logo-pnud-white.svg"
              alt="PNUD Paraguay"
              width={61}
              height={122}
              className="h-[68px] w-auto flex-none"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-pj flex-wrap items-center justify-between gap-2 px-3 py-3 text-[10px] text-[#8FA6BC] xs:px-4 sm:px-[26px]">
          <span>
            © {new Date().getFullYear()} Corte Suprema de Justicia del
            Paraguay.
          </span>
          <span>Plataforma de Seguimiento PEI 2026–2030</span>
        </div>
      </div>
    </footer>
  );
}
