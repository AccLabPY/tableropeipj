"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./sidebar";

const FOCUSABLES =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Navegación móvil: botón hamburguesa en el AppBar + drawer lateral con la
 * misma navegación de la sidebar. Se cierra al navegar, con Escape o tocando
 * el fondo. Visible solo bajo lg (la sidebar fija cubre escritorio).
 */
export function MobileNav({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  // Cerrar al navegar
  useEffect(() => setAbierto(false), [pathname]);

  // Escape, ciclo de foco dentro del panel y bloqueo del scroll de fondo
  useEffect(() => {
    if (!abierto) return;
    const boton = disparador.current;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLES);
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      const activo = document.activeElement;
      if (e.shiftKey && (activo === primero || !panel.current.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>(FOCUSABLES)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      boton?.focus();
    };
  }, [abierto]);

  return (
    <div className="lg:hidden">
      <button
        ref={disparador}
        type="button"
        aria-label="Abrir menú de navegación"
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        className="grid h-[38px] w-[38px] flex-none place-items-center rounded-pj-sm border border-white/[.25] text-white hover:bg-white/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {abierto ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* Fondo */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-navy/60"
          />
          {/* Panel */}
          <div
            ref={panel}
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-superficie shadow-toast"
          >
            <div className="flex items-center justify-between border-b border-linea bg-navy px-4 py-3 text-white">
              <div className="leading-tight">
                <div className="font-serif text-[14px]">Poder Judicial</div>
                <div className="text-[9.5px] uppercase tracking-[.14em] text-[#B8CADA]">
                  PEI 2026–2030
                </div>
              </div>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setAbierto(false)}
                className="grid h-9 w-9 flex-none place-items-center rounded-pj-sm hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scroll-pj safe-b flex-1 overflow-y-auto py-2">
              <NavLinks
                allowedHrefs={allowedHrefs}
                onNavigate={() => setAbierto(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
