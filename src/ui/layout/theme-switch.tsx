"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Scale, Sparkles } from "lucide-react";
import { setTemaAction } from "@/server/tema/switch-action";
import { TEMA_LABEL, TEMAS, type Tema } from "@/shared/tema";
import { cn } from "@/lib/utils";

const ICONO: Record<Tema, typeof Scale> = { clasico: Scale, agentes: Sparkles };

/**
 * Conmutador de tema (segmentado). `sobreOscuro`: estilos para barras
 * navy/gradiente; si no, para fondos claros (login Agentes).
 * Mientras se aplica el cambio (server action + refresh del árbol) muestra un
 * overlay "Cambiando interfaz" con el estilo del tema DESTINO.
 */
export function ThemeSwitch({
  tema,
  sobreOscuro = true,
  compacto = false,
}: {
  tema: Tema;
  sobreOscuro?: boolean;
  compacto?: boolean;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [destino, setDestino] = useState<Tema | null>(null);

  const cambiar = (t: Tema) => {
    if (t === tema || pendiente) return;
    setDestino(t);
    startTransition(async () => {
      await setTemaAction(t);
      router.refresh();
    });
  };

  // El overlay se retira cuando la transición terminó Y el tema ya es el nuevo.
  useEffect(() => {
    if (!pendiente && destino && destino === tema) setDestino(null);
  }, [pendiente, destino, tema]);

  return (
    <>
      <div
        role="group"
        aria-label="Tema visual"
        className={cn(
          "inline-flex items-center rounded-chip border p-[2px]",
          sobreOscuro
            ? "border-white/[.18] bg-white/10"
            : "border-linea bg-superficie shadow-card",
          pendiente && "opacity-70",
        )}
      >
        {TEMAS.map((t) => {
          const Icono = ICONO[t];
          const activo = t === tema;
          return (
            <button
              key={t}
              type="button"
              onClick={() => cambiar(t)}
              aria-pressed={activo}
              title={`Tema ${TEMA_LABEL[t]}`}
              className={cn(
                "inline-flex items-center gap-[5px] rounded-chip px-[9px] py-[4px] text-[10.5px] font-semibold transition-colors",
                sobreOscuro
                  ? activo
                    ? "bg-white text-navy"
                    : "text-white/80 hover:bg-white/15"
                  : activo
                    ? "bg-navy text-white"
                    : "text-muted hover:bg-hover",
              )}
            >
              <Icono className="h-3.5 w-3.5" />
              {compacto ? null : <span className="hidden sm:inline">{TEMA_LABEL[t]}</span>}
            </button>
          );
        })}
      </div>
      {destino ? <OverlayCambio destino={destino} /> : null}
    </>
  );
}

/** Overlay de pantalla completa durante el cambio de tema. */
function OverlayCambio({ destino }: { destino: Tema }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  const agentes = destino === "agentes";
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      data-theme={destino}
      className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 backdrop-blur-sm"
      style={{ animation: "pei-fade .2s ease-out" }}
    >
      <div className="flex flex-col items-center gap-4 rounded-pj bg-superficie px-10 py-8 text-center font-sans shadow-toast">
        <span
          aria-hidden="true"
          className={cn(
            "relative grid h-14 w-14 place-items-center rounded-full",
            agentes ? "bg-marca" : "bg-navy",
          )}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-azul/40" />
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
        </span>
        <div>
          <div className="font-serif text-[15px] font-semibold text-tinta">
            Cambiando interfaz…
          </div>
          <div className="mt-1 text-[12px] text-muted">
            Aplicando el tema {TEMA_LABEL[destino]}
          </div>
        </div>
      </div>
      <style>{`@keyframes pei-fade{from{opacity:0}to{opacity:1}}`}</style>
    </div>,
    document.body,
  );
}
