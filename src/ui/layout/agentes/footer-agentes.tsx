import Image from "next/image";
import { LogoAgentes } from "@/ui/brand/logo-agentes";

/**
 * Pie del tema Agentes PEI: superficie clara con franja de gradiente arriba;
 * los logos institucionales (variantes blancas) van sobre una pastilla navy
 * para conservar su legibilidad.
 */
export function FooterAgentes() {
  return (
    <footer className="border-t border-linea bg-superficie">
      <div className="h-[5px] bg-marca" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-pj grid-cols-1 gap-6 px-3 py-8 xs:px-4 sm:px-[26px] lg:grid-cols-[260px_1fr] lg:gap-10">
        <div className="flex items-center gap-3">
          <LogoAgentes className="h-12 w-12 flex-none" />
          <div className="leading-tight">
            <div className="font-serif text-[15px] font-bold text-tinta">
              Agentes PEI
            </div>
            <div className="mt-[2px] text-[11px] text-muted">
              Impulsando el PEI 2026–2030 desde adentro
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[12px] leading-relaxed text-muted">
            Plataforma de Seguimiento del Plan Estratégico Institucional de la
            Corte Suprema de Justicia, desarrollada con el apoyo técnico del
            Programa de las Naciones Unidas para el Desarrollo.
          </p>
          <div className="flex flex-none items-center gap-4 rounded-pj bg-navy px-4 py-3">
            <Image
              src="/brand/logo-csj.png"
              alt="Corte Suprema de Justicia"
              width={140}
              height={140}
              className="h-10 w-10 flex-none"
            />
            <span className="h-8 w-px bg-white/20" aria-hidden="true" />
            <span className="text-[9.5px] uppercase leading-tight tracking-[.12em] text-on-marca">
              Con el
              <br />
              apoyo de
            </span>
            <Image
              src="/brand/logo-pnud-white.svg"
              alt="PNUD Paraguay"
              width={61}
              height={122}
              className="h-11 w-auto flex-none"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-linea-2">
        <div className="mx-auto flex max-w-pj flex-wrap items-center justify-between gap-2 px-3 py-3 text-[10.5px] text-muted-2 xs:px-4 sm:px-[26px]">
          <span>© {new Date().getFullYear()} Corte Suprema de Justicia del Paraguay.</span>
          <span>Plataforma de Seguimiento PEI 2026–2030</span>
        </div>
      </div>
    </footer>
  );
}
