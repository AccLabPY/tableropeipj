"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, FileWarning, History, XCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

/**
 * Panel de resolución del validador dentro del detalle de una carga.
 * Solo se monta cuando el actor puede validar y la carga es la última
 * versión (vN) — las acciones válidas dependen del estado:
 *   ENVIADO      → Tomar en revisión · Aprobar · Observar · Rechazar
 *   EN_REVISION  → Aprobar · Observar · Rechazar
 *   APROBADO     → Rectificar (crea la versión siguiente)
 */
export function PanelValidacionCarga({
  medicionId,
  estado,
}: {
  medicionId: string;
  estado: EstadoWF;
}) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [toast, setToast] = useState<ResultadoAccion | null>(null);
  const [validacion, setValidacion] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const puedeResolver = estado === "ENVIADO" || estado === "EN_REVISION";
  const puedeTomar = estado === "ENVIADO";
  const puedeRectificar = estado === "APROBADO";
  if (!puedeResolver && !puedeRectificar) return null;

  const ejecutar = (fn: () => Promise<ResultadoAccion>) =>
    startTransition(async () => setToast(await fn()));

  const resolver = (resultado: "APROBADO" | "OBSERVADO" | "RECHAZADO") => {
    if (resultado !== "APROBADO" && comentario.trim().length < 5) {
      setValidacion(
        resultado === "OBSERVADO"
          ? "Escriba el comentario para la dependencia: qué debe corregir antes de reenviar."
          : "Escriba el motivo del rechazo: quedará registrado en el expediente.",
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
              ? "medición aprobada — solo rectificable"
              : "carga pendiente de resolución"
          }
        />
        <CardBody className="space-y-3">
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            {puedeRectificar
              ? "Motivo de la rectificación (obligatorio)"
              : "Comentario de validación (obligatorio para observar o rechazar)"}
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
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => resolver("RECHAZADO")}
                  className={btn("bg-sem-rojo hover:brightness-95")}
                >
                  {pendiente ? <Spinner /> : <XCircle className="h-4 w-4" />}
                  Rechazar
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
              devuelve a la dependencia con su comentario; rechazar cierra la
              carga definitivamente.
            </p>
          ) : (
            <p className="text-[11.5px] text-muted">
              La rectificación pasa esta versión a RECTIFICADO y crea la
              siguiente en borrador (append-only).
            </p>
          )}
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
    </>
  );
}
