"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Lock, LockOpen, X } from "lucide-react";
import {
  fijarPlazoAction,
  habilitarCargaAction,
  type ResultadoPlazo,
} from "@/server/services/plazos-actions";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { Spinner } from "@/ui/components/spinner";
import { cn } from "@/lib/utils";

export type ModoPlazo = "PRORROGA" | "APERTURA" | "CIERRE";

export interface ObjetivoPlazo {
  anio: number;
  codigo: number;
  nombre: string;
  oeCodigo: string;
  aeCodigo: string | null;
  dependencia: string;
  dependenciaId: number | null;
}

const TITULO: Record<ModoPlazo, string> = {
  PRORROGA: "Otorgar prórroga de carga",
  APERTURA: "Habilitar la carga",
  CIERRE: "Cerrar la carga",
};

/**
 * Modal de la DGPD para otorgar prórrogas y habilitar/cerrar la carga con el
 * alcance elegido (indicador, dependencia, acción u objetivo). El alcance
 * GLOBAL se administra desde Administración → Plazos de carga (solo ADMIN).
 */
export function ModalPlazo({
  modo,
  objetivo,
  abierto,
  alCerrar,
}: {
  modo: ModoPlazo;
  objetivo: ObjetivoPlazo;
  abierto: boolean;
  alCerrar: () => void;
}) {
  const router = useRouter();
  const dialogo = useRef<HTMLDivElement>(null);
  const [alcance, setAlcance] = useState<"INDICADOR" | "DEPENDENCIA" | "AE" | "OE">(
    "INDICADOR",
  );
  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [toast, setToast] = useState<ResultadoPlazo | null>(null);
  const [validacion, setValidacion] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") alCerrar();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  const opciones: { valor: typeof alcance; etiqueta: string; entidad: string | null }[] =
    [
      {
        valor: "INDICADOR",
        etiqueta: `Solo el indicador ${objetivo.codigo}`,
        entidad: String(objetivo.codigo),
      },
      {
        valor: "DEPENDENCIA",
        etiqueta: `Toda la dependencia (${objetivo.dependencia})`,
        entidad: objetivo.dependenciaId !== null ? String(objetivo.dependenciaId) : null,
      },
      {
        valor: "AE",
        etiqueta: objetivo.aeCodigo
          ? `La acción estratégica ${objetivo.aeCodigo}`
          : "La acción estratégica (no aplica)",
        entidad: objetivo.aeCodigo,
      },
      {
        valor: "OE",
        etiqueta: `El objetivo ${objetivo.oeCodigo} completo`,
        entidad: objetivo.oeCodigo,
      },
    ];

  const enviar = () => {
    const op = opciones.find((o) => o.valor === alcance)!;
    if (!op.entidad) {
      setValidacion("Ese alcance no aplica a este indicador. Elija otro.");
      return;
    }
    if (modo === "PRORROGA" && !fecha) {
      setValidacion("Indique la nueva fecha límite de carga.");
      return;
    }
    if (motivo.trim().length < 5) {
      setValidacion(
        "Escriba el motivo: queda registrado en el expediente y se envía a la dependencia.",
      );
      return;
    }
    start(async () => {
      const base = {
        anio: objetivo.anio,
        scope: op.valor,
        entidad: op.entidad!,
        motivo: motivo.trim(),
      };
      const r =
        modo === "PRORROGA"
          ? await fijarPlazoAction({
              ...base,
              tipo: "PRORROGA",
              // Fin del día elegido, hora de Asunción (UTC-3).
              fechaLimite: `${fecha}T23:59:59-03:00`,
            })
          : await habilitarCargaAction({ ...base, tipo: modo });
      setToast(r);
    });
  };

  const Icono = modo === "PRORROGA" ? CalendarPlus : modo === "APERTURA" ? LockOpen : Lock;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={TITULO[modo]}
        onMouseDown={(e) => {
          if (!dialogo.current?.contains(e.target as Node)) alCerrar();
        }}
      >
        <div
          ref={dialogo}
          className="w-full max-w-[520px] overflow-hidden rounded-pj border border-linea bg-superficie shadow-toast"
        >
          <div className="flex items-center justify-between border-b border-linea-2 bg-zebra px-5 py-3">
            <h2 className="flex items-center gap-2 font-serif text-[15px] font-bold text-tinta">
              <Icono className="h-[18px] w-[18px] text-azul" />
              {TITULO[modo]}
            </h2>
            <button
              type="button"
              onClick={alCerrar}
              aria-label="Cerrar"
              className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-hover hover:text-tinta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-[12.5px] leading-relaxed text-muted">
              {objetivo.codigo} · {objetivo.nombre}
            </p>

            <fieldset>
              <legend className="mb-2 text-2xs uppercase tracking-[.06em] text-muted">
                Alcance del acto
              </legend>
              <div className="space-y-[6px]">
                {opciones.map((o) => (
                  <label
                    key={o.valor}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-pj-sm border px-3 py-2 text-[12.5px]",
                      alcance === o.valor
                        ? "border-azul bg-azul-soft font-semibold text-azul-d"
                        : "border-linea hover:bg-hover",
                      !o.entidad && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="alcance"
                      checked={alcance === o.valor}
                      disabled={!o.entidad}
                      onChange={() => setAlcance(o.valor)}
                      className="accent-[rgb(var(--c-azul))]"
                    />
                    {o.etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>

            {modo === "PRORROGA" ? (
              <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                Nueva fecha límite
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] normal-case tracking-normal text-tinta"
                />
              </label>
            ) : null}

            <label className="block text-2xs uppercase tracking-[.06em] text-muted">
              Motivo (obligatorio)
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={2}
                placeholder={
                  modo === "PRORROGA"
                    ? "Ej.: cambio de referente en la dependencia; se extiende el plazo."
                    : modo === "CIERRE"
                      ? "Ej.: cierre anticipado por corte de datos del ejercicio."
                      : "Ej.: habilitación excepcional para completar la carga."
                }
                className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] normal-case tracking-normal text-tinta placeholder:text-muted-2"
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-linea-2 bg-zebra px-5 py-3">
            <button
              type="button"
              onClick={alCerrar}
              className="rounded-pj border border-linea bg-superficie px-3 py-[7px] text-[12px] font-semibold hover:bg-hover agentes:rounded-chip"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={enviar}
              className={cn(
                "inline-flex items-center gap-[6px] rounded-pj px-3 py-[7px] text-[12px] font-semibold text-white disabled:opacity-60 agentes:rounded-chip",
                modo === "CIERRE" ? "bg-sem-rojo" : "bg-azul hover:bg-azul-d",
              )}
            >
              {pendiente ? <Spinner /> : <Icono className="h-4 w-4" />}
              {modo === "PRORROGA"
                ? "Otorgar prórroga"
                : modo === "APERTURA"
                  ? "Habilitar carga"
                  : "Cerrar carga"}
            </button>
          </div>
        </div>
      </div>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => {
          const ok = toast?.ok;
          setToast(null);
          if (ok) {
            alCerrar();
            router.refresh();
          }
        }}
      />
      <ModalResultado
        abierto={validacion !== null}
        tipo="validacion"
        mensaje={validacion}
        alCerrar={() => setValidacion(null)}
      />
    </>
  );
}
