"use client";

import { useState } from "react";
import { ExternalLink, FileSpreadsheet } from "lucide-react";

/**
 * Select + acciones para reportes parametrizados: abre el PDF imprimible
 * (`${base}/${valor}?anio=`) y, si hay `baseExcel`, descarga el .xlsx
 * (`${baseExcel}/${valor}?anio=`).
 */
export function SelectorReporte({
  opciones,
  base,
  baseExcel,
  anio,
  placeholder,
}: {
  opciones: { valor: string | number; etiqueta: string }[];
  base: string;
  baseExcel?: string;
  anio: number;
  placeholder: string;
}) {
  const [valor, setValor] = useState("");
  const cls = (activo: boolean, primario: boolean) =>
    `inline-flex flex-none items-center gap-[6px] rounded-pj border px-3 py-[7px] text-[12px] font-semibold ${
      activo
        ? primario
          ? "border-azul-d bg-azul text-white hover:bg-azul-d"
          : "border-linea bg-superficie text-tinta hover:bg-hover"
        : "pointer-events-none border-linea bg-superficie text-muted-2"
    }`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        className="min-w-0 flex-1 basis-[220px] rounded-pj border border-linea bg-superficie px-2 py-[7px] text-[12px] text-tinta"
      >
        <option value="">{placeholder}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={String(o.valor)}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      <a
        href={
          valor
            ? `${base}/${encodeURIComponent(valor)}?anio=${anio}`
            : undefined
        }
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!valor}
        className={cls(!!valor, true)}
      >
        PDF
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {baseExcel ? (
        <a
          href={
            valor
              ? `${baseExcel}/${encodeURIComponent(valor)}?anio=${anio}`
              : undefined
          }
          aria-disabled={!valor}
          className={cls(!!valor, false)}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-sem-verde-fg" />
          Excel
        </a>
      ) : null}
    </div>
  );
}
