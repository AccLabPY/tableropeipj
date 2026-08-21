"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { EstadoWF, Semaforo } from "@/domain/types";
import { ChipWorkflow } from "@/ui/features/shared/chip-workflow";
import { SemPill } from "@/ui/components/sem-pill";
import { cn, fmtPct } from "@/lib/utils";

export interface IndicadorDeDependencia {
  codigo: number;
  nombre: string;
  estadoMedicion: EstadoWF | null;
  semaforo: Semaforo;
  capado: number | null;
}

export interface FilaDependencia {
  dependencia: string;
  /** Id de la dependencia (para los reportes exportables); null si no resuelto. */
  dependenciaId: number | null;
  esperadas: number;
  aprobadas: number;
  indicadores: IndicadorDeDependencia[];
}

/**
 * Acordeón de cobertura por dependencia: cada fila se expande para listar
 * los indicadores a cargo (principal) con su estado de reporte del período.
 */
export function CoberturaDependencias({
  filas,
  anio,
}: {
  filas: FilaDependencia[];
  anio: number;
}) {
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const alternar = (dep: string) =>
    setAbiertas((prev) => {
      const s = new Set(prev);
      if (s.has(dep)) s.delete(dep);
      else s.add(dep);
      return s;
    });

  if (filas.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[12.5px] text-muted">
        Sin dependencias con indicadores reportables.
      </p>
    );
  }

  return (
    <ul>
      {filas.map((f) => {
        const abierta = abiertas.has(f.dependencia);
        return (
          <li key={f.dependencia} className="border-b border-linea-2 last:border-b-0">
            <button
              type="button"
              onClick={() => alternar(f.dependencia)}
              aria-expanded={abierta}
              className="tap flex w-full items-center gap-3 px-4 py-[10px] text-left hover:bg-[#F7F9FB]"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 flex-none text-muted-2 transition-transform",
                  abierta && "rotate-180",
                )}
              />
              <span className="min-w-0 flex-1 text-[12.5px]">{f.dependencia}</span>
              <span className="tnum flex-none text-[12px] text-muted">
                {f.aprobadas}/{f.esperadas}
              </span>
              <span className="tnum w-[52px] flex-none text-right text-[12.5px] font-semibold">
                {fmtPct(f.esperadas > 0 ? f.aprobadas / f.esperadas : 0)}
              </span>
            </button>

            {abierta ? (
              <div className="border-t border-linea-2 bg-[#FAFBFC] px-4 py-2">
                {f.dependenciaId !== null ? (
                  <div className="flex flex-wrap items-center gap-3 border-b border-linea-2 pb-2 pt-1 text-[11px]">
                    <span className="uppercase tracking-[.06em] text-muted-2">
                      Exportar
                    </span>
                    <a
                      href={`/reportes/dependencia/${f.dependenciaId}?anio=${anio}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-azul-d hover:underline"
                    >
                      Reporte PDF
                    </a>
                    <a
                      href={`/api/v1/reportes/dependencia/${f.dependenciaId}?anio=${anio}`}
                      className="font-semibold text-[#1f6a49] hover:underline"
                    >
                      Planilla Excel
                    </a>
                  </div>
                ) : null}
                <ul className="divide-y divide-linea-2">
                  {f.indicadores.map((i) => (
                    <li
                      key={i.codigo}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
                    >
                      <Link
                        href={`/indicadores/${i.codigo}?anio=${anio}`}
                        className="w-[42px] flex-none font-serif text-[12.5px] font-semibold text-azul-d hover:underline"
                      >
                        {i.codigo}
                      </Link>
                      <span className="min-w-0 flex-1 basis-full text-[12px] leading-[1.35] xs:basis-auto">
                        {i.nombre.length > 90 ? `${i.nombre.slice(0, 90)}…` : i.nombre}
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        <ChipWorkflow estado={i.estadoMedicion ?? "SIN_CARGA"} />
                        <span className="tnum w-[44px] text-right text-[11.5px] font-semibold">
                          {i.capado === null ? "—" : fmtPct(i.capado)}
                        </span>
                        <SemPill sem={i.semaforo} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
