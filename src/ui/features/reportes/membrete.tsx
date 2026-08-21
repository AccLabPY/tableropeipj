import Image from "next/image";
import { fmtFechaLarga } from "@/lib/utils";

/**
 * Membrete institucional de los reportes imprimibles: franja navy con los
 * logos (blancos, diseñados para fondo oscuro), título y metadatos.
 */
export function MembreteReporte({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <header className="mb-5 print:break-inside-avoid">
      <div className="flex items-center justify-between gap-4 rounded-pj bg-navy px-5 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/logo-csj.png"
            alt="Corte Suprema de Justicia"
            width={140}
            height={140}
            className="h-11 w-11 flex-none"
          />
          <div className="min-w-0 leading-tight">
            <div className="font-serif text-[15px]">{titulo}</div>
            <div className="mt-[2px] text-[10px] uppercase tracking-[.14em] text-[#B8CADA]">
              Plan Estratégico Institucional 2026–2030 · Poder Judicial del
              Paraguay
            </div>
          </div>
        </div>
        <Image
          src="/brand/logo-pnud-white.svg"
          alt="PNUD Paraguay"
          width={61}
          height={122}
          className="h-11 w-auto flex-none"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>{subtitulo}</span>
        <span>Generado el {fmtFechaLarga(new Date())}</span>
      </div>
    </header>
  );
}

/** Pie de página de los reportes. */
export function PieReporte() {
  return (
    <footer className="mt-6 border-t border-linea pt-3 text-center text-[10px] text-muted-2">
      Plataforma de Seguimiento del PEI 2026–2030 · Corte Suprema de Justicia
      del Paraguay · Solo las mediciones aprobadas por la DGPD alimentan las
      cifras oficiales.
    </footer>
  );
}
