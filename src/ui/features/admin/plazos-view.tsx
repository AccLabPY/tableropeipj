"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CalendarPlus, Lock, LockOpen, Save } from "lucide-react";
import {
  fijarPlazoAction,
  fijarPlazoGlobalAction,
  habilitarCargaAction,
  type ResultadoPlazo,
} from "@/server/services/plazos-actions";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { BuscadorLista, coincide } from "@/ui/components/buscador-lista";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { Spinner } from "@/ui/components/spinner";
import { cn, fmtFechaCorta } from "@/lib/utils";

export interface FilaPlazo {
  codigo: number;
  nombre: string;
  oeCodigo: string;
  aeCodigo: string | null;
  dependencia: string;
  dependenciaId: number | null;
  estado: "ABIERTA" | "CERRADA";
  fechaLimite: string | null;
  diasRestantes: number | null;
  conProrroga: boolean;
  cierreManual: boolean;
  origen: string | null;
}

export interface ActoPlazo {
  id: number;
  scope: string;
  entidad: string;
  tipo: string;
  fechaLimite: string | null;
  motivo: string | null;
  autor: string | null;
  creadoEn: string;
}

const TIPO_LABEL: Record<string, { txt: string; cls: string }> = {
  PLAZO: { txt: "Plazo", cls: "bg-azul-soft text-azul-d" },
  PRORROGA: { txt: "Prórroga", cls: "bg-sem-verde-bg text-sem-verde-fg" },
  APERTURA: { txt: "Habilitación", cls: "bg-sem-verde-bg text-sem-verde-fg" },
  CIERRE: { txt: "Cierre", cls: "bg-sem-rojo-bg text-sem-rojo-fg" },
};

/**
 * Administración de plazos de carga: plazo general del ejercicio,
 * apertura/cierre global y gestión por indicador (plazo, prórroga,
 * habilitación o cierre), más la bitácora de actos administrativos.
 */
export function PlazosView({
  anio,
  plazoGlobal,
  filas,
  actos,
  esAdmin,
}: {
  anio: number;
  plazoGlobal: string | null;
  filas: FilaPlazo[];
  actos: ActoPlazo[];
  esAdmin: boolean;
}) {
  const router = useRouter();
  const [fechaGlobal, setFechaGlobal] = useState(plazoGlobal?.slice(0, 10) ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const [fechaFila, setFechaFila] = useState("");
  const [motivo, setMotivo] = useState("");
  const [toast, setToast] = useState<ResultadoPlazo | null>(null);
  const [validacion, setValidacion] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const visibles = useMemo(
    () =>
      filas.filter((f) =>
        coincide(`${f.codigo} ${f.nombre} ${f.oeCodigo} ${f.dependencia}`, busqueda),
      ),
    [filas, busqueda],
  );
  const cerradas = filas.filter((f) => f.estado === "CERRADA").length;
  const porVencer = filas.filter(
    (f) => f.estado === "ABIERTA" && f.diasRestantes !== null && f.diasRestantes <= 7,
  ).length;

  const ejecutar = (fn: () => Promise<ResultadoPlazo>) =>
    start(async () => {
      const r = await fn();
      setToast(r);
      if (r.ok) {
        setMotivo("");
        setFechaFila("");
        router.refresh();
      }
    });

  const conMotivo = (fn: () => Promise<ResultadoPlazo>) => {
    if (motivo.trim().length < 5) {
      setValidacion("Escriba el motivo del acto: queda registrado en la bitácora.");
      return;
    }
    ejecutar(fn);
  };

  return (
    <>
      {/* Plazo general del ejercicio */}
      <Card className="mb-4">
        <CardHeader
          title={`Plazo general de carga · ejercicio ${anio}`}
          meta={`${filas.length} indicadores · ${cerradas} con carga cerrada · ${porVencer} por vencer`}
        />
        <CardBody className="space-y-3">
          <p className="text-[12.5px] text-muted">
            Fecha límite por defecto de todos los indicadores del ejercicio. Al
            vencer, las dependencias dejan de poder cargar y enviar; la DGPD
            puede otorgar prórrogas por indicador, acción, objetivo o
            dependencia. Sin fecha, la carga permanece abierta.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-2xs uppercase tracking-[.06em] text-muted">
              Fecha límite general
              <input
                type="date"
                value={fechaGlobal}
                disabled={!esAdmin}
                onChange={(e) => setFechaGlobal(e.target.value)}
                className="mt-1 block rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] normal-case tracking-normal text-tinta disabled:opacity-60"
              />
            </label>
            {esAdmin ? (
              <>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    ejecutar(() =>
                      fijarPlazoGlobalAction({
                        anio,
                        fechaLimite: fechaGlobal
                          ? `${fechaGlobal}T23:59:59-03:00`
                          : null,
                      }),
                    )
                  }
                  className="tap inline-flex items-center gap-[6px] rounded-pj bg-azul px-3 py-2 text-[12px] font-semibold text-white hover:bg-azul-d disabled:opacity-60 agentes:rounded-chip"
                >
                  {pendiente ? <Spinner /> : <Save className="h-4 w-4" />}
                  Guardar plazo
                </button>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    conMotivo(() =>
                      habilitarCargaAction({
                        anio,
                        scope: "GLOBAL",
                        entidad: "GLOBAL",
                        tipo: "APERTURA",
                        motivo: motivo.trim(),
                      }),
                    )
                  }
                  className="tap inline-flex items-center gap-[6px] rounded-pj border border-sem-verde-border bg-superficie px-3 py-2 text-[12px] font-semibold text-sem-verde-fg hover:bg-sem-verde-bg agentes:rounded-chip"
                >
                  <LockOpen className="h-4 w-4" />
                  Habilitar carga general
                </button>
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    conMotivo(() =>
                      habilitarCargaAction({
                        anio,
                        scope: "GLOBAL",
                        entidad: "GLOBAL",
                        tipo: "CIERRE",
                        motivo: motivo.trim(),
                      }),
                    )
                  }
                  className="tap inline-flex items-center gap-[6px] rounded-pj border border-sem-rojo-border bg-superficie px-3 py-2 text-[12px] font-semibold text-sem-rojo-fg hover:bg-sem-rojo-bg agentes:rounded-chip"
                >
                  <Lock className="h-4 w-4" />
                  Cerrar carga general
                </button>
              </>
            ) : (
              <p className="text-[11.5px] text-muted">
                Solo el Administrador puede fijar el plazo general; la DGPD
                gestiona prórrogas y cierres por indicador.
              </p>
            )}
          </div>
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            Motivo (obligatorio para habilitar/cerrar y para prorrogar)
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: apertura del período de carga del ejercicio 2026."
              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] normal-case tracking-normal text-tinta placeholder:text-muted-2"
            />
          </label>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Ventana por indicador */}
        <Card>
          <CardHeader
            title="Ventana de carga por indicador"
            meta={`${visibles.length} de ${filas.length}`}
          />
          <BuscadorLista
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar indicador, objetivo o dependencia…"
            resultados={visibles.length}
          />
          <div className="scroll-pj max-h-[560px] overflow-y-auto">
            {visibles.map((f) => (
              <div
                key={f.codigo}
                className={cn(
                  "border-b border-linea-2 px-4 py-3",
                  sel === f.codigo && "bg-azul-soft",
                )}
              >
                <button
                  type="button"
                  onClick={() => setSel(sel === f.codigo ? null : f.codigo)}
                  className="block w-full text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[12.5px] font-semibold text-azul-d">
                      {f.codigo}
                    </span>
                    <span
                      className={cn(
                        "rounded-chip px-[8px] py-[1px] text-[10px] font-semibold",
                        f.estado === "CERRADA"
                          ? "bg-sem-rojo-bg text-sem-rojo-fg"
                          : f.diasRestantes !== null && f.diasRestantes <= 7
                            ? "bg-sem-ambar-bg text-sem-ambar-fg"
                            : "bg-sem-verde-bg text-sem-verde-fg",
                      )}
                    >
                      {f.estado === "CERRADA"
                        ? f.cierreManual
                          ? "Cerrada por la DGPD"
                          : "Plazo vencido"
                        : f.fechaLimite
                          ? `Vence ${fmtFechaCorta(f.fechaLimite)}`
                          : "Sin plazo"}
                    </span>
                    {f.conProrroga ? (
                      <span className="rounded-chip bg-azul-soft px-[8px] py-[1px] text-[10px] font-semibold text-azul-d">
                        Prorrogado
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-[3px] block text-[12px] leading-[1.3]">
                    {f.nombre.length > 90 ? `${f.nombre.slice(0, 90)}…` : f.nombre}
                  </span>
                  <span className="mt-[2px] block text-[10.5px] text-muted-2">
                    {f.oeCodigo} · {f.aeCodigo ?? "Nivel OE"} · {f.dependencia}
                  </span>
                </button>

                {sel === f.codigo ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-linea-2 pt-3">
                    <label className="text-2xs uppercase tracking-[.06em] text-muted">
                      Nueva fecha
                      <input
                        type="date"
                        value={fechaFila}
                        onChange={(e) => setFechaFila(e.target.value)}
                        className="mt-1 block rounded-pj border border-linea bg-superficie px-2 py-[6px] text-[12.5px] normal-case tracking-normal text-tinta"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => {
                        if (!fechaFila) {
                          setValidacion("Elija la nueva fecha límite.");
                          return;
                        }
                        conMotivo(() =>
                          fijarPlazoAction({
                            anio,
                            scope: "INDICADOR",
                            entidad: String(f.codigo),
                            tipo: "PRORROGA",
                            fechaLimite: `${fechaFila}T23:59:59-03:00`,
                            motivo: motivo.trim(),
                          }),
                        );
                      }}
                      className="tap inline-flex items-center gap-[6px] rounded-pj border border-azul-line bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-azul-d hover:bg-azul-soft agentes:rounded-chip"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Prorrogar
                    </button>
                    {f.estado === "CERRADA" ? (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          conMotivo(() =>
                            habilitarCargaAction({
                              anio,
                              scope: "INDICADOR",
                              entidad: String(f.codigo),
                              tipo: "APERTURA",
                              motivo: motivo.trim(),
                            }),
                          )
                        }
                        className="tap inline-flex items-center gap-[6px] rounded-pj border border-sem-verde-border bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-sem-verde-fg hover:bg-sem-verde-bg agentes:rounded-chip"
                      >
                        <LockOpen className="h-3.5 w-3.5" />
                        Habilitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          conMotivo(() =>
                            habilitarCargaAction({
                              anio,
                              scope: "INDICADOR",
                              entidad: String(f.codigo),
                              tipo: "CIERRE",
                              motivo: motivo.trim(),
                            }),
                          )
                        }
                        className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-muted hover:bg-hover agentes:rounded-chip"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Cerrar
                      </button>
                    )}
                    {f.dependenciaId !== null ? (
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => {
                          if (!fechaFila) {
                            setValidacion("Elija la nueva fecha límite.");
                            return;
                          }
                          conMotivo(() =>
                            fijarPlazoAction({
                              anio,
                              scope: "DEPENDENCIA",
                              entidad: String(f.dependenciaId),
                              tipo: "PRORROGA",
                              fechaLimite: `${fechaFila}T23:59:59-03:00`,
                              motivo: motivo.trim(),
                            }),
                          );
                        }}
                        className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-tinta hover:bg-hover agentes:rounded-chip"
                      >
                        Prorrogar toda la dependencia
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {visibles.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">
                Sin indicadores que coincidan con la búsqueda.
              </p>
            ) : null}
          </div>
        </Card>

        {/* Bitácora */}
        <Card>
          <CardHeader title="Actos administrativos" meta={`${actos.length} registrados`} />
          <div className="scroll-pj max-h-[620px] overflow-y-auto">
            {actos.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-muted">
                Todavía no se registraron plazos, prórrogas ni cierres para este
                ejercicio.
              </p>
            ) : (
              actos.map((a) => {
                const t = TIPO_LABEL[a.tipo] ?? { txt: a.tipo, cls: "bg-sem-gris-bg text-muted" };
                return (
                  <div key={a.id} className="border-b border-linea-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-chip px-[8px] py-[1px] text-[10px] font-semibold",
                          t.cls,
                        )}
                      >
                        {t.txt}
                      </span>
                      <span className="text-[12px] font-semibold text-tinta">
                        {a.scope === "GLOBAL" ? "Todo el ejercicio" : a.entidad}
                      </span>
                      {a.fechaLimite ? (
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted">
                          <CalendarClock className="h-3.5 w-3.5" />
                          hasta {fmtFechaCorta(a.fechaLimite)}
                        </span>
                      ) : null}
                    </div>
                    {a.motivo ? (
                      <p className="mt-1 text-[12px] text-tinta">“{a.motivo}”</p>
                    ) : null}
                    <p className="mt-[3px] text-[10.5px] text-muted-2">
                      {a.autor ? `${a.autor} · ` : ""}
                      {fmtFechaCorta(a.creadoEn)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
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
