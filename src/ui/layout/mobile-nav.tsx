"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./sidebar";

/**
 * Navegación móvil: botón hamburguesa en el AppBar + drawer lateral con la
 * misma navegación de la sidebar. Se cierra al navegar, con Escape o tocando
 * el fondo. Visible solo bajo lg (la sidebar fija cubre escritorio).
 */
export function MobileNav({ allowedHrefs }: { allowedHrefs?: string[] }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  // Cerrar al navegar
  useEffect(() => setAbierto(false), [pathname]);

  // Escape + bloquear scroll del body con el drawer abierto
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Abrir menú de navegación"
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        className="grid h-[38px] w-[38px] place-items-center rounded-pj-sm border border-white/[.25] text-white hover:bg-white/10"
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
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col bg-superficie shadow-toast">
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
                className="grid h-8 w-8 place-items-center rounded-pj-sm hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scroll-pj flex-1 overflow-y-auto py-2">
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
