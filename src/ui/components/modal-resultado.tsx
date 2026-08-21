"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TipoModal = "exito" | "error" | "validacion";

const ESTILO: Record<
  TipoModal,
  { Icono: typeof CheckCircle2; color: string; bg: string; titulo: string }
> = {
  exito: {
    Icono: CheckCircle2,
    color: "text-sem-verde",
    bg: "bg-sem-verde-bg",
    titulo: "Operación exitosa",
  },
  error: {
    Icono: XCircle,
    color: "text-sem-rojo",
    bg: "bg-sem-rojo-bg",
    titulo: "No se pudo completar",
  },
  validacion: {
    Icono: TriangleAlert,
    color: "text-sem-ambar",
    bg: "bg-sem-ambar-bg",
    titulo: "Revise el formulario",
  },
};

/**
 * Modal de resultado de una operación: éxito / error / validación.
 * - `detalles`: lista de puntos (típico en validación de formularios).
 * - `hrefAlCerrar`: redirección automática al cerrar (donde corresponda).
 * Cierra con el botón, la tecla Escape o clic en el fondo.
 */
export function ModalResultado({
  abierto,
  tipo,
  titulo,
  mensaje,
  detalles,
  alCerrar,
  hrefAlCerrar,
}: {
  abierto: boolean;
  tipo: TipoModal;
  titulo?: string;
  mensaje?: string | null;
  detalles?: string[];
  alCerrar: () => void;
  hrefAlCerrar?: string;
}) {
  const router = useRouter();
  const botonRef = useRef<HTMLButtonElement>(null);

  const cerrar = () => {
    alCerrar();
    if (hrefAlCerrar) router.push(hrefAlCerrar);
  };

  useEffect(() => {
    if (!abierto) return;
    botonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  if (!abierto) return null;
  const e = ESTILO[tipo];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/45 p-4 backdrop-blur-[2px]"
      onClick={cerrar}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-resultado-titulo"
        onClick={(ev) => ev.stopPropagation()}
        className="w-full max-w-[420px] rounded-pj border border-linea bg-superficie p-5 shadow-toast"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid h-10 w-10 flex-none place-items-center rounded-full",
              e.bg,
            )}
          >
            <e.Icono className={cn("h-5 w-5", e.color)} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="modal-resultado-titulo"
              className="font-serif text-[15.5px] font-semibold text-tinta"
            >
              {titulo ?? e.titulo}
            </h2>
            {mensaje ? (
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                {mensaje}
              </p>
            ) : null}
            {detalles && detalles.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed text-tinta">
                {detalles.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            ref={botonRef}
            type="button"
            onClick={cerrar}
            className="tap rounded-pj border border-azul-d bg-azul px-5 py-[8px] text-[12.5px] font-semibold text-white hover:bg-azul-d"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
