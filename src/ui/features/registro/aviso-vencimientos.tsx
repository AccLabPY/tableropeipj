"use client";

import { useEffect, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso emergente al entrar a Registro: indicadores propios cuyo plazo de
 * carga vence en ≤7 días y todavía no fueron enviados. Se muestra una vez
 * por sesión de navegador y por ejercicio (sessionStorage).
 */
export function AvisoVencimientos({
  anio,
  items,
  onIr,
}: {
  anio: number;
  items: { codigo: number; nombre: string; diasRestantes: number }[];
  onIr: (codigo: number) => void;
}) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const clave = `pei-aviso-plazos-${anio}`;
    try {
      if (sessionStorage.getItem(clave)) return;
      sessionStorage.setItem(clave, "1");
    } catch {
      /* modo privado: se muestra igual */
    }
    setAbierto(true);
  }, [anio, items.length]);

  if (!abierto || items.length === 0) return null;

  const cerrar = () => setAbierto(false);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Plazos de carga próximos a vencer"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-pj border border-linea bg-superficie shadow-toast">
        <div className="flex items-start justify-between gap-3 border-b border-linea-2 bg-sem-ambar-bg px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-[2px] grid h-9 w-9 flex-none place-items-center rounded-full bg-sem-ambar/15 text-sem-ambar-fg">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-[15.5px] font-bold text-tinta">
                {items.length === 1
                  ? "Tiene 1 indicador por vencer"
                  : `Tiene ${items.length} indicadores por vencer`}
              </h2>
              <p className="mt-[2px] text-[12.5px] text-muted">
                Cargue y envíe el avance antes del cierre; después necesitará una
                prórroga de la DGPD.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar aviso"
            className="grid h-7 w-7 flex-none place-items-center rounded-full text-muted hover:bg-white/60 hover:text-tinta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="scroll-pj max-h-[300px] divide-y divide-linea-2 overflow-y-auto">
          {items.map((i) => (
            <li key={i.codigo}>
              <button
                type="button"
                onClick={() => {
                  onIr(i.codigo);
                  cerrar();
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-hover"
              >
                <span className="font-serif text-[13px] font-semibold text-azul-d">
                  {i.codigo}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px]">
                  {i.nombre}
                </span>
                <span
                  className={cn(
                    "flex-none whitespace-nowrap rounded-chip px-[9px] py-[2px] text-[11px] font-semibold",
                    i.diasRestantes <= 1
                      ? "bg-sem-rojo-bg text-sem-rojo-fg"
                      : "bg-sem-ambar-bg text-sem-ambar-fg",
                  )}
                >
                  {i.diasRestantes <= 0
                    ? "vence hoy"
                    : i.diasRestantes === 1
                      ? "1 día"
                      : `${i.diasRestantes} días`}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex justify-end border-t border-linea-2 bg-zebra px-5 py-3">
          <button
            type="button"
            onClick={cerrar}
            className="rounded-pj bg-azul px-4 py-[7px] text-[12px] font-semibold text-white hover:bg-azul-d agentes:rounded-chip"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
