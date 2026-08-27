import Image from "next/image";
import { fmtFechaLarga } from "@/lib/utils";

/**
 * Membrete institucional de los reportes imprimibles: franja navy con el
 * escudo de la Corte Suprema, el título y los metadatos del reporte.
 * Por decisión institucional (2026) el logo del PNUD se reubicó al pie.
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
        <div className="flex min-w-0 items-center gap-4">
          <Image
            src="/brand/logo-csj.png"
            alt="Corte Suprema de Justicia"
            width={140}
            height={140}
            className="h-[52px] w-[52px] flex-none"
          />
          <div className="min-w-0 leading-tight">
            <div className="font-serif text-[19px]">{titulo}</div>
            <div className="mt-[3px] text-[11.5px] uppercase tracking-[.14em] text-on-marca">
              Plan Estratégico Institucional 2026–2030 · Poder Judicial del
              Paraguay
            </div>
          </div>
        </div>
      </div>
      <div className="mt-[10px] flex flex-wrap items-center justify-between gap-2 text-[13.5px] text-muted">
        <span>{subtitulo}</span>
        <span>Generado el {fmtFechaLarga(new Date())}</span>
      </div>
    </header>
  );
}

/**
 * Pie institucional: identidad de la Corte Suprema y, a la derecha, el
 * apoyo técnico del PNUD.
 */
export function PieReporte() {
  return (
    <footer className="mt-7 border-t border-linea pt-4 print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="font-serif text-[14px] font-semibold text-navy">
            Corte Suprema de Justicia – Poder Judicial del Paraguay
          </div>
          <div className="mt-[3px] text-[11.5px] text-muted">
            Plataforma de Seguimiento del PEI 2026–2030 · Solo las mediciones
            aprobadas por la DGPD alimentan las cifras oficiales.
          </div>
        </div>
        <div className="flex flex-none items-center gap-3">
          <span className="text-[10px] uppercase leading-tight tracking-[.12em] text-muted-2">
            Con el
            <br />
            apoyo de
          </span>
          <Image
            src="/brand/logo-pnud-azul.svg"
            alt="Programa de las Naciones Unidas para el Desarrollo"
            width={61}
            height={122}
            className="h-[46px] w-auto"
          />
        </div>
      </div>
    </footer>
  );
}
