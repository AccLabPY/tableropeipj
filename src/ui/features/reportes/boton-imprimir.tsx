"use client";

import { Printer } from "lucide-react";

/** Botón flotante de los reportes: abre Imprimir → "Guardar como PDF". */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-pj border border-azul-d bg-azul px-4 py-[10px] text-[13px] font-semibold text-white shadow-toast hover:bg-azul-d print:hidden"
    >
      <Printer className="h-4 w-4" />
      Imprimir / Guardar PDF
    </button>
  );
}
