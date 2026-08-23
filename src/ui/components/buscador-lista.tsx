"use client";

import { Search, X } from "lucide-react";

/** Normaliza para búsqueda: minúsculas y sin diacríticos. */
export function normalizarBusqueda(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** ¿`texto` contiene todas las palabras de `consulta`? (sin acentos ni mayúsculas) */
export function coincide(texto: string, consulta: string): boolean {
  const q = normalizarBusqueda(consulta).trim();
  if (!q) return true;
  const t = normalizarBusqueda(texto);
  return q.split(/\s+/).every((p) => t.includes(p));
}

/** Cuadro de búsqueda compacto para filtrar listados dentro de una Card. */
export function BuscadorLista({
  valor,
  onChange,
  placeholder = "Buscar…",
  resultados,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Cantidad de coincidencias (se muestra cuando hay consulta). */
  resultados?: number;
}) {
  return (
    <div className="border-b border-linea-2 bg-zebra px-3 py-2">
      <label className="flex h-[34px] items-center gap-2 rounded-pj border border-linea bg-superficie px-[10px] text-muted focus-within:border-azul focus-within:shadow-[0_0_0_3px_rgb(var(--c-azul)/.12)] agentes:rounded-chip">
        <Search className="h-[15px] w-[15px] flex-none" aria-hidden="true" />
        <input
          type="search"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-tinta outline-none focus-visible:outline-none placeholder:text-muted-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {valor ? (
          <>
            {resultados !== undefined ? (
              <span className="tnum text-[10.5px] text-muted-2">{resultados}</span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Limpiar búsqueda"
              className="grid h-5 w-5 flex-none place-items-center rounded-full hover:bg-hover hover:text-tinta"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : null}
      </label>
    </div>
  );
}
