"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CheckCircle2,
  Eye,
  FileWarning,
  History,
  Lock,
  LockOpen,
} from "lucide-react";
import type { EstadoWF } from "@/domain/types";
import {
  rectificarMedicionAction,
  tomarEnRevisionAction,
  validarMedicionAction,
  type ResultadoAccion,
} from "@/server/services/registro-actions";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { Spinner } from "@/ui/components/spinner";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { ModalPlazo, type ModoPlazo } from "./modal-plazo";
import type { VentanaDTO } from "@/shared/dtos/registro";
import { cn } from "@/lib/utils";

/**
 * Panel de resolución del validador dentro del detalle de una carga.
 * Solo se monta cuando el actor puede validar y la carga es la última
 * versión (vN) — las acciones válidas dependen del estado:
 *   ENVIADO      → Tomar en revisión · Aprobar · Observar
 *   EN_REVISION  → Aprobar · Observar
 *   APROBADO     → Rectificar (crea la versión siguiente)
 * En cualquier estado ofrece la gestión del plazo: prórroga, habilitación
 * o cierre de la carga. El rechazo se retiró del circuito (2026).
 */
export function PanelValidacionCarga({
  medicionId,
  estado,
  ventana,
  objetivo,
}: {
  medicionId: string;
  estado: EstadoWF;
  ventana: VentanaDTO;
  objetivo: {
    anio: number;
    codigo: number;
    nombre: string;
    oeCodigo: string;
    aeCodigo: string | null;
    dependencia: string;
    dependenciaId: number | null;
  };
}) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [toast, setToast] = useState<ResultadoAccion | null>(null);
  const [validacion, setValidacion] = useState<string | null>(null);
  const [modalPlazo, setModalPlazo] = useState<ModoPlazo | null>(null);
  const [pendiente, startTransition] = useTransition();

  const puedeResolver = estado === "ENVIADO" || estado === "EN_REVISION";
  const puedeTomar = estado === "ENVIADO";
  const puedeRectificar = estado === "APROBADO";

  const ejecutar = (fn: () => Promise<ResultadoAccion>) =>
    startTransition(async () => setToast(await fn()));

  const resolver = (resultado: "APROBADO" | "OBSERVADO") => {
    if (resultado !== "APROBADO" && comentario.trim().length < 5) {
      setValidacion(
        "Escriba el comentario para la dependencia: qué debe corregir antes de reenviar.",
      );
      return;
    }
    ejecutar(() =>
      validarMedicionAction(medicionId, {
        resultado,
        comentario: comentario.trim() || null,
      }),
    );
  };

  const rectificar = () => {
    if (comentario.trim().length < 5) {
      setValidacion(
        "Indique el motivo de la rectificación: se registrará en la nueva versión.",
      );
      return;
    }
    ejecutar(() => rectificarMedicionAction(medicionId, comentario.trim()));
  };

  const btn = (extra: string) =>
    cn(
      "tap inline-flex items-center gap-[6px] rounded-pj px-3 py-[8px] text-[12px] font-semibold text-white disabled:opacity-60 agentes:rounded-chip",
      extra,
    );

  return (
    <>
      <Card className="mb-4 border-azul-line">
        <CardHeader
          title="Resolución de la DGPD"
          meta={
            puedeRectificar
              ? "medición aprobada — rectificable"
              : puedeResolver
                ? "carga pendiente de resolución"
                : "gestión del plazo de carga"
          }
        />
        <CardBody className="space-y-3">
          {puedeResolver || puedeRectificar ? (
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            {puedeRectificar
              ? "Motivo de la rectificación (obligatorio)"
              : "Comentario de validación (obligatorio para observar)"}
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={2}
              placeholder={
                puedeRectificar
                  ? "Ej.: error de carga en el denominador; se corrige con datos del inventario definitivo."
                  : "Ej.: la evidencia no respalda el valor informado; adjuntar la planilla consolidada."
              }
              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] normal-case tracking-normal text-tinta placeholder:text-muted-2"
            />
          </label>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {puedeTomar ? (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => ejecutar(() => tomarEnRevisionAction(medicionId))}
                className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[8px] text-[12px] font-semibold text-tinta hover:bg-hover disabled:opacity-60 agentes:rounded-chip"
              >
                {pendiente ? <Spinner /> : <Eye className="h-4 w-4 text-azul" />}
                Tomar en revisión
              </button>
            ) : null}
            {puedeResolver ? (
              <>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => resolver("APROBADO")}
                  className={btn("bg-sem-verde hover:brightness-95")}
                >
                  {pendiente ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}
                  Aprobar
                </button>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => resolver("OBSERVADO")}
                  className={btn("bg-sem-ambar hover:brightness-95")}
                >
                  {pendiente ? <Spinner /> : <FileWarning className="h-4 w-4" />}
                  Observar
                </button>
              </>
            ) : null}
            {puedeRectificar ? (
              <button
                type="button"
                disabled={pendiente}
                onClick={rectificar}
                className={btn("bg-purpura hover:brightness-95")}
              >
                {pendiente ? <Spinner /> : <History className="h-4 w-4" />}
                Rectificar
              </button>
            ) : null}
          </div>
          {puedeResolver ? (
            <p className="text-[11.5px] text-muted">
              Aprobar publica la cifra en los tableros oficiales; observar la
              devuelve a la dependencia con su comentario para que corrija y
              reenvíe.
            </p>
          ) : puedeRectificar ? (
            <p className="text-[11.5px] text-muted">
              La rectificación pasa esta versión a RECTIFICADO y crea la
              siguiente en borrador (append-only).
            </p>
          ) : null}

          {/* Plazo de carga del indicador */}
          <div className="flex flex-wrap items-center gap-2 border-t border-linea-2 pt-3">
            <span className="text-2xs uppercase tracking-[.06em] text-muted">
              Plazo de carga
            </span>
            <span
              className={cn(
                "rounded-chip px-[9px] py-[2px] text-[11px] font-semibold",
                ventana.estado === "CERRADA"
                  ? "bg-sem-rojo-bg text-sem-rojo-fg"
                  : "bg-sem-verde-bg text-sem-verde-fg",
              )}
            >
              {ventana.estado === "CERRADA" ? "Cerrada" : "Abierta"}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setModalPlazo("PRORROGA")}
              className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-azul-d hover:bg-hover agentes:rounded-chip"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Prórroga
            </button>
            {ventana.estado === "CERRADA" ? (
              <button
                type="button"
                onClick={() => setModalPlazo("APERTURA")}
                className="tap inline-flex items-center gap-[6px] rounded-pj border border-sem-verde-border bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-sem-verde-fg hover:bg-sem-verde-bg agentes:rounded-chip"
              >
                <LockOpen className="h-3.5 w-3.5" />
                Habilitar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setModalPlazo("CIERRE")}
                className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-muted hover:bg-hover agentes:rounded-chip"
              >
                <Lock className="h-3.5 w-3.5" />
                Cerrar
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => {
          const ok = toast?.ok;
          setToast(null);
          if (ok) {
            setComentario("");
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
      {modalPlazo ? (
        <ModalPlazo
          modo={modalPlazo}
          abierto
          alCerrar={() => setModalPlazo(null)}
          objetivo={objetivo}
        />
      ) : null}
    </>
  );
}
