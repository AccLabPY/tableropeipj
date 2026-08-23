"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { coincide } from "./buscador-lista";

export type OpcionCombobox = { valor: string; etiqueta: string; grupo?: string };

/**
 * Select con buscador incorporado (patrón combobox ARIA): lista filtrable,
 * navegación con teclado (↑ ↓ Enter Esc), cierre al hacer clic afuera y
 * botón para limpiar. Reemplaza a los `<select>` nativos largos.
 */
export function Combobox({
  opciones,
  valor,
  onChange,
  placeholder = "— Seleccionar —",
  className,
  nombre,
}: {
  opciones: OpcionCombobox[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  className?: string;
  /** Nombre del campo oculto para formularios (opcional). */
  nombre?: string;
}) {
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);

  const seleccionada = opciones.find((o) => o.valor === valor);
  const filtradas = useMemo(
    () => opciones.filter((o) => coincide(`${o.etiqueta} ${o.grupo ?? ""}`, consulta)),
    [opciones, consulta],
  );

  useEffect(() => setActivo(0), [consulta, abierto]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [abierto]);

  // Mantener visible la opción activa
  useEffect(() => {
    if (!abierto) return;
    lista.current
      ?.querySelector<HTMLElement>(`[data-idx="${activo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activo, abierto]);

  const abrir = () => {
    setAbierto(true);
    setConsulta("");
    requestAnimationFrame(() => entrada.current?.focus());
  };
  const cerrar = () => {
    setAbierto(false);
    setConsulta("");
  };
  const elegir = (o: OpcionCombobox) => {
    onChange(o.valor);
    cerrar();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((a) => Math.min(a + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtradas[activo]) elegir(filtradas[activo]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cerrar();
    }
  };

  let grupoPrevio: string | undefined;

  return (
    <div ref={raiz} className={cn("relative min-w-0", className)}>
      {nombre ? <input type="hidden" name={nombre} value={valor} /> : null}
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        className={cn(
          "flex h-[36px] w-full items-center gap-2 rounded-pj border border-linea bg-superficie px-[10px] text-left text-[12.5px] hover:border-azul-line focus:border-azul focus:outline-none focus:shadow-[0_0_0_3px_rgb(var(--c-azul)/.12)] agentes:rounded-chip",
          abierto && "border-azul shadow-[0_0_0_3px_rgb(var(--c-azul)/.12)]",
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", seleccionada ? "text-tinta" : "text-muted")}>
          {seleccionada ? seleccionada.etiqueta : placeholder}
        </span>
        {seleccionada ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Limpiar selección"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="grid h-5 w-5 flex-none place-items-center rounded-full text-muted hover:bg-hover hover:text-tinta"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown
          className={cn("h-4 w-4 flex-none text-muted transition-transform", abierto && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {abierto ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-pj border border-linea bg-superficie shadow-toast">
          <div className="flex items-center gap-2 border-b border-linea-2 px-3 py-2 text-muted">
            <Search className="h-[15px] w-[15px] flex-none" aria-hidden="true" />
            <input
              ref={entrada}
              type="text"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              onKeyDown={onKey}
              placeholder="Escribí para filtrar…"
              role="combobox"
              aria-expanded={abierto}
              aria-controls={`${id}-lista`}
              aria-activedescendant={filtradas[activo] ? `${id}-op-${activo}` : undefined}
              aria-autocomplete="list"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-tinta outline-none focus-visible:outline-none placeholder:text-muted-2"
            />
            <span className="tnum text-[10.5px] text-muted-2">
              {filtradas.length}/{opciones.length}
            </span>
          </div>
          <ul
            ref={lista}
            id={`${id}-lista`}
            role="listbox"
            className="scroll-pj max-h-[280px] overflow-y-auto py-1"
          >
            {filtradas.length === 0 ? (
              <li className="px-3 py-4 text-center text-[12px] text-muted">
                Sin coincidencias para “{consulta}”.
              </li>
            ) : null}
            {filtradas.map((o, idx) => {
              const cabecera = o.grupo && o.grupo !== grupoPrevio ? o.grupo : null;
              grupoPrevio = o.grupo;
              const esActiva = idx === activo;
              const esSel = o.valor === valor;
              return (
                <li key={o.valor} role="presentation">
                  {cabecera ? (
                    <div className="sticky top-0 bg-zebra px-3 pb-[3px] pt-[6px] text-[10px] uppercase tracking-[.08em] text-muted-2">
                      {cabecera}
                    </div>
                  ) : null}
                  <div
                    id={`${id}-op-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={esSel}
                    onMouseEnter={() => setActivo(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => elegir(o)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-3 py-[7px] text-[12.5px] leading-snug",
                      esActiva && "bg-azul-soft",
                      esSel && "font-semibold text-azul-d",
                    )}
                  >
                    <span className="min-w-0 flex-1">{o.etiqueta}</span>
                    {esSel ? <Check className="h-3.5 w-3.5 flex-none text-azul" /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
