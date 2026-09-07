"use client";

// Pantalla de carga de UN indicador: sin lista ni buscador (pedido del
// Poder Judicial, 2026). El listado vive en /registro (RegistroTabla) y
// esta vista se abre desde el botón "Reportar avance".

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, Clock, Lock, LockOpen, X } from "lucide-react";
import {
  calcularCumplimiento,
  calcularValorObservado,
  formulaLegible,
  nivelAlcanzado,
  semaforo as clasificar,
} from "@/domain";
import type { EstadoWF } from "@/domain/types";
import type { RegistroDTO, RegistroItemDTO, VentanaDTO } from "@/shared/dtos/registro";
import type { EvidenciaResumenDTO } from "@/shared/dtos/indicador-ficha";
import {
  eliminarEvidenciaAction,
  enviarMedicionAction,
  guardarBorradorAction,
  subirEvidenciaAction,
  tomarEnRevisionAction,
  validarMedicionAction,
  type ResultadoAccion,
} from "@/server/services/registro-actions";
import { Card, CardHeader } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { Spinner } from "@/ui/components/spinner";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { WF_CHIP } from "@/ui/features/shared/chip-workflow";
import { ModalPlazo, type ModoPlazo } from "./modal-plazo";
import { cn, fmtBytes, fmtFechaCorta, fmtNum, fmtPct, fmtValor } from "@/lib/utils";

const EDITABLES: (EstadoWF | "PENDIENTE")[] = ["PENDIENTE", "BORRADOR", "OBSERVADO"];

interface FormState {
  /** Valores base por clave de variable ("a","b","c" o "valor"), como texto. */
  valores: Record<string, string>;
  /** % de avance de un indicador de escala (editable; el nivel se deriva). */
  pctEscala: string;
  fuente: string;
  obs: string;
}

function formDesdeItem(it: RegistroItemDTO | undefined): FormState {
  const m = it?.medicion;
  const valores: Record<string, string> = {};
  if (it) {
    for (const def of it.variablesDef) {
      // Rehidratación: variables guardadas → legacy num/den → valor directo.
      const guardado = m?.valoresVariables?.[def.clave];
      let v: number | null | undefined = guardado;
      if (v == null && m) {
        if (def.clave === "a") v = m.numerador;
        else if (def.clave === "b") v = m.denominador;
        else if (def.clave === "valor" && m.nivelEscala == null)
          v = m.valorObservado;
      }
      valores[def.clave] = v != null ? String(v) : "";
    }
  }
  return {
    valores,
    pctEscala:
      it?.tipoCalculo === "NIVEL_ESCALA" && m?.valorObservado != null
        ? String(m.valorObservado)
        : "",
    fuente: m?.fuente ?? "",
    obs: m?.observaciones ?? "",
  };
}

export function RegistroFormulario({
  data,
  item,
}: {
  data: RegistroDTO;
  /** Indicador de la ruta /registro/indicador/[codigo]. */
  item: RegistroItemDTO;
}) {
  const [form, setForm] = useState<FormState>(() => formDesdeItem(item));
  const [toast, setToast] = useState<ResultadoAccion | null>(null);
  const [modalPlazo, setModalPlazo] = useState<ModoPlazo | null>(null);
  const [validacion, setValidacion] = useState<string[] | null>(null);
  const [comentario, setComentario] = useState("");
  const [pendiente, startTransition] = useTransition();

  // Al navegar a otro indicador (misma ruta, distinto código) se rehidrata.
  useEffect(() => {
    setForm(formDesdeItem(item));
    setToast(null);
    setComentario("");
  }, [item]);

  const estadoWF: EstadoWF | "PENDIENTE" = item.medicion?.estado ?? "PENDIENTE";
  // La carga se bloquea al vencer el plazo o al cerrarla la DGPD; los roles de
  // validación (DGPD/Admin) siguen pudiendo operar para corregir o regularizar.
  const cargaCerrada = item.ventana.estado === "CERRADA" && !data.puedeValidar;
  const editable =
    data.puedeCargar && EDITABLES.includes(estadoWF) && !cargaCerrada;
  const modoEscala = item.tipoCalculo === "NIVEL_ESCALA";

  /** Valores numéricos del form (NaN → null). */
  const valoresNumericos = useMemo(() => {
    const out: Record<string, number | null> = {};
    if (!item) return out;
    for (const def of item.variablesDef) {
      const v = parseFloat(form.valores[def.clave] ?? "");
      out[def.clave] = Number.isNaN(v) ? null : v;
    }
    return out;
  }, [item, form.valores]);

  /**
   * CÁLCULO AUTOMÁTICO del valor observado con el MISMO motor de fórmulas
   * del dominio que usa el backend (formula.ts).
   */
  const derivado = useMemo(() => {
    if (!item) return { valor: null as number | null, error: undefined };
    if (modoEscala) {
      const pct = parseFloat(form.pctEscala);
      if (Number.isNaN(pct)) return { valor: null, error: undefined };
      return { valor: pct, error: undefined };
    }
    const r = calcularValorObservado(item.tipoCalculo, valoresNumericos);
    return { valor: r.valor, error: r.error };
  }, [item, form.pctEscala, valoresNumericos, modoEscala]);
  const valorDerivado = derivado.valor;

  /** Nivel alcanzado según el % (mismo motor de dominio que el servidor). */
  const nivelAuto = useMemo(() => {
    if (!modoEscala || valorDerivado === null) return null;
    return nivelAlcanzado(item.escala, valorDerivado);
  }, [modoEscala, item.escala, valorDerivado]);

  /** CÁLCULO EN VIVO con el MISMO motor de dominio que usa el backend. */
  const enVivo = useMemo(() => {
    if (!item) return null;
    const r = calcularCumplimiento({
      base: item.lineaBase,
      meta: item.meta,
      valor: valorDerivado,
      sentido: item.sentido,
      metaConcluida: item.metaConcluida,
    });
    const sem = clasificar(r.capado, {
      verde: item.umbralVerde,
      amarillo: item.umbralAmarillo,
    });
    return { ...r, sem };
  }, [item, valorDerivado]);

  const inputPayload = () => {
    if (!item) return null;
    const valores: Record<string, number> = {};
    for (const [k, v] of Object.entries(valoresNumericos)) {
      if (v !== null) valores[k] = v;
    }
    return {
      indicadorCodigo: item.codigo,
      anio: data.anio,
      nivelEscala: null,
      valorObservado:
        modoEscala && form.pctEscala !== "" ? Number(form.pctEscala) : null,
      valores: modoEscala || Object.keys(valores).length === 0 ? null : valores,
      fuente: form.fuente || null,
      observaciones: form.obs || null,
    };
  };

  const ejecutar = (fn: () => Promise<ResultadoAccion>) =>
    startTransition(async () => setToast(await fn()));

  /**
   * Validación de formulario del lado cliente (además de la del servidor):
   * devuelve la lista de problemas a mostrar en el popup de validación.
   */
  const validarFormulario = (paraEnvio: boolean): string[] => {
    if (!item) return ["Seleccione un indicador de la lista."];
    const problemas: string[] = [];
    if (modoEscala) {
      const pct = parseFloat(form.pctEscala);
      if (form.pctEscala === "" || Number.isNaN(pct)) {
        problemas.push("Informe el porcentaje de avance del período (0 a 100).");
      } else if (pct < 0 || pct > 100) {
        problemas.push("El porcentaje de avance debe estar entre 0 y 100.");
      }
    } else {
      for (const def of item.variablesDef) {
        if (valoresNumericos[def.clave] === null) {
          problemas.push(
            def.clave === "valor"
              ? "Complete el valor observado del período."
              : `Complete la variable (${def.clave}) — ${
                  def.descripcion.length > 60
                    ? `${def.descripcion.slice(0, 60)}…`
                    : def.descripcion
                }`,
          );
        }
      }
      if (derivado.error === "DENOMINADOR_CERO") {
        problemas.push("El denominador de la fórmula no puede ser cero.");
      }
    }
    if (paraEnvio && !form.fuente.trim()) {
      problemas.push(
        "Indique la fuente / medio de verificación (obligatoria al enviar a validación).",
      );
    }
    return problemas;
  };

  /** Valida y, si está todo bien, ejecuta; si no, abre el popup de validación. */
  const validarYEjecutar = (
    paraEnvio: boolean,
    fn: () => Promise<ResultadoAccion>,
  ) => {
    const problemas = validarFormulario(paraEnvio);
    if (problemas.length > 0) {
      setValidacion(problemas);
      return;
    }
    ejecutar(fn);
  };

  /** Como `ejecutar`, pero devuelve el resultado (para encadenar en la UI). */
  const ejecutarYDevolver = (
    fn: () => Promise<ResultadoAccion>,
  ): Promise<ResultadoAccion> =>
    new Promise((resolve) => {
      startTransition(async () => {
        const r = await fn();
        setToast(r);
        resolve(r);
      });
    });

  /**
   * Adjuntar evidencia. Si aún no existe la medición, guarda el borrador
   * automáticamente y sube el archivo en un solo paso (pedido DGPD).
   */
  const adjuntarEvidencia = async (
    formData: FormData,
  ): Promise<ResultadoAccion> => {
    if (item?.medicion) return subirEvidenciaAction(item.medicion.id, formData);
    const payload = inputPayload();
    if (!payload || valorDerivado === null) {
      return {
        ok: false,
        mensaje:
          "Complete el valor del avance antes de adjuntar: la evidencia se asocia al borrador.",
      };
    }
    const guardado = await guardarBorradorAction(payload);
    if (!guardado.ok || !guardado.medicionId) return guardado;
    const subida = await subirEvidenciaAction(guardado.medicionId, formData);
    if (!subida.ok) {
      return {
        ok: false,
        mensaje: `El borrador se guardó, pero la evidencia no pudo subirse: ${subida.mensaje}`,
      };
    }
    return { ok: true, mensaje: "Borrador guardado y evidencia adjuntada." };
  };

  const ventana = item.ventana;

  return (
    <div>
      {/* Formulario */}
      <Card>
        <CardHeader
          title="Carga del avance"
          meta={
            item.medicion
              ? `versión ${item.medicion.version} · ejercicio ${data.anio}`
              : `ejercicio ${data.anio}`
          }
        />
        <div className="p-4">
          <>
              {/* Aviso solo si la carga está cerrada: el plazo vigente ya se
                  muestra en el encabezado de la pantalla. */}
              <AvisoCargaCerrada
                ventana={item.ventana}
                puedeValidar={data.puedeValidar}
              />

              {/* Ficha resumida */}
              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-pj border border-linea bg-linea xs:grid-cols-2 lg:grid-cols-4">
                <FichaCelda label="Objetivo" valor={item.oeCodigo} />
                <FichaCelda
                  label="Unidad"
                  valor={item.unidad === "PORCENTAJE" ? "%" : item.unidad}
                />
                <FichaCelda
                  label="Sentido"
                  valor={item.sentido === "ASC" ? "Ascendente ↑" : "Descendente ↓"}
                />
                <FichaCelda
                  label={`Meta ${data.anio}`}
                  valor={
                    item.metaConcluida
                      ? "concluido"
                      : fmtValor(item.meta, item.unidad)
                  }
                />
                <FichaCelda
                  ancho
                  label="Fórmula · línea base"
                  valor={`${item.formula ?? "—"}  ·  base ${
                    item.basePendiente ? "a determinar" : fmtNum(item.lineaBase)
                  }`}
                />
                {item.descripcion ? (
                  <FichaCelda ancho label="Descripción" valor={item.descripcion} />
                ) : null}
              </div>

              {/* Cómo se calcula: fórmula + descripción de cada variable */}
              <div className="mt-4 rounded-pj border border-azul-line bg-azul-soft px-4 py-3">
                <div className="text-2xs font-semibold uppercase tracking-[.06em] text-azul-d">
                  Cómo se calcula
                </div>
                <div className="tnum mt-1 font-serif text-[14px] text-tinta">
                  {formulaLegible(item.tipoCalculo, item.formula)}
                </div>
                {modoEscala ? (
                  <p className="mt-2 text-[11.5px] leading-[1.45] text-muted">
                    Este indicador reporta el <b>nivel cualitativo alcanzado</b>{" "}
                    en su escala de avance ({item.escala.length} niveles): el %
                    del nivel seleccionado es el valor observado del período.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {item.variablesDef.map((v) => (
                      <li
                        key={v.clave}
                        className="flex gap-2 text-[11.5px] leading-[1.45]"
                      >
                        <span className="tnum flex-none font-serif font-semibold text-azul-d">
                          {v.clave === "valor" ? "valor" : `(${v.clave})`}
                        </span>
                        <span className="text-tinta">{v.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Formulario de carga */}
              {data.puedeCargar ? (
                <fieldset
                  disabled={!editable || pendiente}
                  className={cn("mt-4", !editable && "opacity-60")}
                >
                  <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
                    {modoEscala ? (
                      <div className="sm:col-span-2">
                        <div className="grid grid-cols-1 gap-[14px] xs:grid-cols-[180px_1fr]">
                          <label className="text-2xs uppercase tracking-[.06em] text-muted">
                            Avance del período (%)
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={form.pctEscala}
                              onChange={(e) =>
                                setForm({ ...form, pctEscala: e.target.value })
                              }
                              placeholder="0"
                              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[13px] normal-case tracking-normal text-tinta"
                            />
                          </label>
                          <div className="text-2xs uppercase tracking-[.06em] text-muted">
                            Nivel alcanzado (automático)
                            <div className="mt-1 flex min-h-[38px] items-center rounded-pj border border-linea bg-hover px-3 py-2 text-[12.5px] normal-case tracking-normal">
                              {nivelAuto ? (
                                <span>
                                  <b className="text-azul-d">
                                    Nivel {nivelAuto.nivel}
                                  </b>{" "}
                                  <span className="text-muted">
                                    · {nivelAuto.descripcion}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-muted-2">
                                  Se determina según el porcentaje cargado.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Escala de referencia: el nivel se selecciona solo,
                            según la cota alcanzada por el % reportado. */}
                        <ul className="mt-3 space-y-[4px]">
                          {[...item.escala]
                            .sort((a, b) => a.nivel - b.nivel)
                            .map((e) => (
                              <li
                                key={e.nivel}
                                className={cn(
                                  "flex items-baseline gap-2 rounded-pj-sm border px-3 py-[6px] text-[11.5px]",
                                  nivelAuto?.nivel === e.nivel
                                    ? "border-azul bg-azul-soft font-semibold text-azul-d"
                                    : "border-linea-2 text-muted",
                                )}
                              >
                                <span className="tnum flex-none font-serif font-semibold">
                                  Nivel {e.nivel}
                                </span>
                                <span className="min-w-0 flex-1">
                                  {e.descripcion}
                                </span>
                                <span className="tnum flex-none text-[10.5px]">
                                  {e.nivel === 0
                                    ? "preparativos"
                                    : `desde ${fmtNum(e.pctMax)}%`}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ) : (
                      /* Inputs dinámicos: un campo por variable de la fórmula,
                         con su descripción breve visible. */
                      item.variablesDef.map((def) => (
                        <CampoVariable
                          key={def.clave}
                          clave={def.clave}
                          descripcion={def.descripcion}
                          unidad={item.unidad}
                          value={form.valores[def.clave] ?? ""}
                          onChange={(v) =>
                            setForm({
                              ...form,
                              valores: { ...form.valores, [def.clave]: v },
                            })
                          }
                        />
                      ))
                    )}
                    <label className="text-2xs uppercase tracking-[.06em] text-muted sm:col-span-2">
                      Valor observado (calculado automáticamente)
                      <input
                        readOnly
                        value={
                          valorDerivado === null
                            ? derivado.error === "DENOMINADOR_CERO"
                              ? "El denominador no puede ser cero"
                              : ""
                            : `${fmtNum(valorDerivado)}${item.unidad === "PORCENTAJE" ? " %" : ""}`
                        }
                        placeholder="Se calcula al completar las variables"
                        className={cn(
                          "mt-1 block w-full rounded-pj border px-[9px] py-2 text-[12.5px] font-semibold normal-case tracking-normal",
                          derivado.error === "DENOMINADOR_CERO"
                            ? "border-sem-rojo-border bg-sem-rojo-bg text-sem-rojo"
                            : "border-linea bg-hover text-tinta",
                        )}
                      />
                    </label>
                    <label className="text-2xs uppercase tracking-[.06em] text-muted sm:col-span-2">
                      Fuente / medio de verificación
                      <input
                        value={form.fuente}
                        onChange={(e) =>
                          setForm({ ...form, fuente: e.target.value })
                        }
                        placeholder="Informe, acta o reporte estadístico de respaldo…"
                        className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                      />
                    </label>
                    <label className="text-2xs uppercase tracking-[.06em] text-muted sm:col-span-2">
                      Observaciones
                      <textarea
                        value={form.obs}
                        onChange={(e) => setForm({ ...form, obs: e.target.value })}
                        rows={3}
                        placeholder="Notas sobre el avance del período, supuestos o desvíos…"
                        className="mt-1 block w-full resize-y rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                      />
                    </label>
                  </div>
                </fieldset>
              ) : null}

              {/* Evidencias respaldatorias */}
              {data.puedeCargar ? (
                <div className="mt-4 rounded-pj border border-linea bg-zebra p-4">
                  <div className="mb-2 text-2xs font-semibold uppercase tracking-[.06em] text-muted">
                    Evidencias respaldatorias
                  </div>
                  <ListaEvidencias
                    evidencias={item.medicion?.evidencias ?? []}
                    puedeEliminar={editable}
                    onEliminar={(id) =>
                      ejecutar(() => eliminarEvidenciaAction(id))
                    }
                  />
                  {item.medicion || editable ? (
                    <>
                      <SubidorEvidencia
                        disabled={pendiente}
                        onSubir={(formData) =>
                          ejecutarYDevolver(() => adjuntarEvidencia(formData))
                        }
                      />
                      {!item.medicion ? (
                        <p className="mt-2 text-[10.5px] text-muted-2">
                          Al adjuntar, el borrador se guarda automáticamente
                          con los valores cargados arriba.
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {/* Cumplimiento en vivo */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-pj border border-linea bg-zebra px-4 py-[14px]">
                <div className="text-[12px] text-muted">
                  Cumplimiento estimado del período
                  <b className="block font-serif text-titulo text-tinta">
                    {enVivo && enVivo.estado === "OK"
                      ? fmtPct(enVivo.capado)
                      : "—"}
                  </b>
                  <span className="text-[11px]">
                    {item.basePendiente
                      ? "Línea base a determinar al cierre de 2025"
                      : item.metaConcluida
                        ? "Período concluido para este indicador (ciclo de vida)"
                        : `meta ${fmtValor(item.meta, item.unidad)} · base ${fmtNum(item.lineaBase)} · sentido ${item.sentido === "ASC" ? "ascendente" : "descendente"} · umbral ${Math.round(item.umbralVerde * 100)}/${Math.round(item.umbralAmarillo * 100)}`}
                  </span>
                </div>
                <SemPill sem={enVivo?.sem ?? "GRIS"} grande />
              </div>

              {/* Stepper + acceso al expediente individual de la carga */}
              <Stepper estado={estadoWF} />
              {item.medicion ? (
                <div className="mt-3">
                  <a
                    href={`/registro/carga/${item.medicion.id}`}
                    className="inline-flex items-center gap-[5px] text-[12px] font-semibold text-azul hover:underline"
                  >
                    Ver detalle de la carga (historial y resoluciones) →
                  </a>
                </div>
              ) : null}

              {/* Mensajes de validación previa */}
              {item.medicion?.validaciones?.length ? (
                <div className="mt-3 space-y-2">
                  {item.medicion.validaciones.slice(0, 2).map((v, ix) => (
                    <p
                      key={ix}
                      className={cn(
                        "rounded-pj-sm px-3 py-2 text-[12px]",
                        v.resultado === "APROBADO" &&
                          "bg-sem-verde-bg text-sem-verde-fg",
                        v.resultado === "OBSERVADO" &&
                          "bg-sem-ambar-bg text-sem-ambar-fg",
                        v.resultado === "RECHAZADO" &&
                          "bg-sem-rojo-bg text-sem-rojo-fg",
                      )}
                    >
                      <b>{v.resultado}</b>
                      {v.comentario ? ` — ${v.comentario}` : ""}
                    </p>
                  ))}
                </div>
              ) : null}

              {/* Acciones de carga */}
              {data.puedeCargar && editable ? (
                <div className="mt-[18px] flex flex-col gap-[10px] border-t border-linea-2 pt-4 xs:flex-row xs:flex-wrap">
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      validarYEjecutar(true, () =>
                        enviarMedicionAction(inputPayload()),
                      )
                    }
                    className="tap inline-flex w-full items-center justify-center gap-2 rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50 xs:w-auto"
                  >
                    {pendiente ? <Spinner /> : null}
                    {pendiente ? "Procesando…" : "Enviar a validación"}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      validarYEjecutar(false, () =>
                        guardarBorradorAction(inputPayload()),
                      )
                    }
                    className="tap inline-flex w-full items-center justify-center gap-2 rounded-pj border border-linea bg-superficie px-4 py-[9px] text-[12.5px] font-semibold hover:bg-hover disabled:opacity-50 xs:w-auto"
                  >
                    {pendiente ? <Spinner className="text-muted" /> : null}
                    Guardar borrador
                  </button>
                </div>
              ) : null}
              {data.puedeCargar && !editable && estadoWF !== "APROBADO" ? (
                <p className="mt-3 text-[12px] text-muted">
                  {cargaCerrada
                    ? "El plazo de carga está cerrado: solicite una prórroga a la DGPD."
                    : `La medición está ${WF_CHIP[estadoWF].label.toLowerCase()}: no puede editarse hasta la resolución del validador.`}
                </p>
              ) : null}

              {/* Panel del validador */}
              {data.puedeValidar ? (
                <div className="mt-[18px] rounded-pj border border-azul-line bg-azul-soft p-4">
                  <div className="mb-2 text-[12.5px] font-semibold text-azul-d">
                    Validación DGPD
                    {item.medicion ? (
                      <>
                        {" "}
                        — valor cargado:{" "}
                        {fmtValor(item.medicion.valorObservado, item.unidad)} (v
                        {item.medicion.version})
                      </>
                    ) : (
                      <> — sin carga de la dependencia en este período</>
                    )}
                  </div>

                  {item.medicion ? (
                    <div className="mb-3">
                      <div className="mb-1 text-2xs font-semibold uppercase tracking-[.06em] text-azul-d">
                        Evidencias respaldatorias — revisar antes de resolver
                      </div>
                      <ListaEvidencias
                        evidencias={item.medicion.evidencias}
                        puedeEliminar={
                          item.medicion.estado !== "APROBADO" &&
                          item.medicion.estado !== "RECTIFICADO"
                        }
                        onEliminar={(id) =>
                          ejecutar(() => eliminarEvidenciaAction(id))
                        }
                      />
                    </div>
                  ) : null}

                  {item.medicion?.estado === "ENVIADO" ? (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() =>
                        ejecutar(() =>
                          tomarEnRevisionAction(item.medicion!.id),
                        )
                      }
                      className="tap mb-3 rounded-pj border border-azul-line bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-azul-d hover:bg-azul-soft disabled:opacity-50"
                    >
                      Tomar en revisión
                    </button>
                  ) : null}

                  {item.medicion &&
                  ["ENVIADO", "EN_REVISION"].includes(item.medicion.estado) ? (
                    <>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                    placeholder="Comentario de la validación (obligatorio al observar)…"
                    className="mb-3 block w-full resize-y rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px]"
                  />
                  <div className="flex flex-wrap gap-[10px]">
                    <BotonValidar
                      texto="Aprobar"
                      cls="border-sem-verde-fg bg-sem-verde text-white hover:opacity-90"
                      disabled={pendiente}
                      onClick={() =>
                        ejecutar(() =>
                          validarMedicionAction(item.medicion!.id, {
                            resultado: "APROBADO",
                            comentario: comentario || null,
                          }),
                        )
                      }
                    />
                    <BotonValidar
                      texto="Observar"
                      cls="border-sem-ambar-fg bg-sem-ambar text-white hover:opacity-90"
                      disabled={pendiente}
                      onClick={() => {
                        if (comentario.trim().length < 5) {
                          setValidacion([
                            "El comentario de la validación es obligatorio al observar (mínimo 5 caracteres): indique qué debe corregir la dependencia.",
                          ]);
                          return;
                        }
                        ejecutar(() =>
                          validarMedicionAction(item.medicion!.id, {
                            resultado: "OBSERVADO",
                            comentario,
                          }),
                        );
                      }}
                    />
                  </div>
                    </>
                  ) : null}

                  {/* Gestión del plazo de carga de este indicador */}
                  <div className="mt-3 flex flex-wrap items-center gap-[10px] border-t border-azul-line pt-3">
                    <span className="text-2xs font-semibold uppercase tracking-[.06em] text-azul-d">
                      Plazo de carga
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalPlazo("PRORROGA")}
                      className="tap inline-flex items-center gap-[6px] rounded-pj border border-azul-line bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-azul-d hover:bg-azul-soft agentes:rounded-chip"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Prórroga
                    </button>
                    {ventana?.estado === "CERRADA" ? (
                      <button
                        type="button"
                        onClick={() => setModalPlazo("APERTURA")}
                        className="tap inline-flex items-center gap-[6px] rounded-pj border border-sem-verde-border bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-sem-verde-fg hover:bg-sem-verde-bg agentes:rounded-chip"
                      >
                        <LockOpen className="h-3.5 w-3.5" />
                        Habilitar carga
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalPlazo("CIERRE")}
                        className="tap inline-flex items-center gap-[6px] rounded-pj border border-linea bg-superficie px-3 py-[7px] text-[11.5px] font-semibold text-muted hover:bg-hover agentes:rounded-chip"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Cerrar carga
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

          </>
        </div>
      </Card>

      {/* Popups de resultado y de validación */}
      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
      />
      <ModalResultado
        abierto={validacion !== null}
        tipo="validacion"
        mensaje="Antes de continuar, corrija lo siguiente:"
        detalles={validacion ?? undefined}
        alCerrar={() => setValidacion(null)}
      />

      {/* Prórroga / habilitación / cierre (DGPD y Admin) */}
      {modalPlazo ? (
        <ModalPlazo
          modo={modalPlazo}
          abierto
          alCerrar={() => setModalPlazo(null)}
          objetivo={{
            anio: data.anio,
            codigo: item.codigo,
            nombre: item.nombre,
            oeCodigo: item.oeCodigo,
            aeCodigo: item.aeCodigo,
            dependencia: item.dependenciaPrincipal,
            dependenciaId: item.dependenciaPrincipalId,
          }}
        />
      ) : null}
    </div>
  );
}

function FichaCelda({
  label,
  valor,
  ancho,
}: {
  label: string;
  valor: string;
  ancho?: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-superficie px-3 py-[10px]",
        ancho && "xs:col-span-2 lg:col-span-4",
      )}
    >
      <div className="text-[10px] uppercase tracking-[.06em] text-muted-2">
        {label}
      </div>
      <div className="mt-[3px] text-[13px]">{valor}</div>
    </div>
  );
}

/**
 * Input de una variable base de la fórmula: label con la clave "(a)" y la
 * descripción breve de la variable visible para el usuario que carga.
 */
function CampoVariable({
  clave,
  descripcion,
  unidad,
  value,
  onChange,
}: {
  clave: string;
  descripcion: string;
  unidad: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const esDirecta = clave === "valor";
  const sufijoUnidad = esDirecta
    ? unidad === "PUNTAJE"
      ? " (puntaje)"
      : unidad === "NUMERO"
        ? " (número)"
        : ""
    : "";
  return (
    <label
      className={cn(
        // Columna flexible a altura completa: la etiqueta (de 1 o 2 líneas)
        // crece y el input queda anclado abajo, de modo que los campos de la
        // misma fila siempre quedan alineados entre sí.
        "flex h-full flex-col text-2xs uppercase tracking-[.06em] text-muted",
        esDirecta && "sm:col-span-2",
      )}
    >
      <span className="flex flex-1 items-baseline gap-[6px]">
        <span className="tnum font-serif text-[13px] font-semibold normal-case text-azul-d">
          {esDirecta ? "Valor" : `(${clave})`}
        </span>
        <span className="normal-case tracking-normal">
          {descripcion.length > 90
            ? `${descripcion.slice(0, 90)}…`
            : descripcion}
          {sufijoUnidad}
        </span>
      </span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1 block w-full flex-none rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[13px] normal-case tracking-normal text-tinta"
      />
    </label>
  );
}

function Stepper({ estado }: { estado: EstadoWF | "PENDIENTE" }) {
  // fase = primer paso aún no cumplido (los anteriores se pintan con check).
  // Aprobado/rectificado = circuito completo → los 3 pasos en verde.
  // El paso 3 tiene variantes propias: ✕ rojo (rechazado) y ⏱ ámbar (en revisión).
  const fase =
    estado === "APROBADO" || estado === "RECTIFICADO" || estado === "RECHAZADO"
      ? 4
      : ["ENVIADO", "EN_REVISION"].includes(estado)
        ? 3
        : estado === "PENDIENTE"
          ? 1
          : 2;
  const rechazado = estado === "RECHAZADO";
  const enRevision = estado === "EN_REVISION";
  const pasos = ["Borrador", "Enviado", "Validado por DGPD"];
  return (
    <div className="mt-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:gap-0">
      {pasos.map((p, ix) => {
        const n = ix + 1;
        const esUltimo = n === pasos.length;
        // Variantes del paso final
        const rojo = esUltimo && rechazado;
        const ambar = esUltimo && enRevision;
        const done = fase > n && !rojo;
        const now = fase === n && !ambar;
        return (
          <div key={p} className="flex items-center xs:flex-1 xs:last:flex-none">
            <div
              className={cn(
                "flex items-center gap-2 text-[12px]",
                rojo && "font-semibold text-sem-rojo",
                ambar && "font-semibold text-sem-ambar-fg",
                !rojo && !ambar && done && "text-sem-verde",
                !rojo && !ambar && now && "font-semibold text-azul-d",
                !rojo && !ambar && !done && !now && "text-muted-2",
              )}
            >
              <span
                className={cn(
                  "grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] bg-superficie text-[11px]",
                  rojo && "border-sem-rojo bg-sem-rojo text-white",
                  ambar && "border-sem-ambar text-sem-ambar-fg",
                  !rojo && !ambar && done && "border-sem-verde bg-sem-verde text-white",
                  !rojo && !ambar && now && "border-azul text-azul",
                  !rojo && !ambar && !done && !now && "border-linea",
                )}
              >
                {rojo ? (
                  <X className="h-[13px] w-[13px]" strokeWidth={2.5} />
                ) : ambar ? (
                  <Clock className="h-[13px] w-[13px]" strokeWidth={2.2} />
                ) : done ? (
                  "✓"
                ) : (
                  n
                )}
              </span>
              {rojo ? "Rechazado por DGPD" : ambar ? "En revisión de DGPD" : p}
            </div>
            {ix < pasos.length - 1 ? (
              <span className="mx-[10px] hidden h-[1.5px] min-w-[24px] flex-1 bg-linea xs:block" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Lista de evidencias adjuntas: descarga (binario propio) o link de
 *  referencia (metadata legada), y eliminar si el llamador lo habilita. */
function ListaEvidencias({
  evidencias,
  puedeEliminar,
  onEliminar,
}: {
  evidencias: EvidenciaResumenDTO[];
  puedeEliminar: boolean;
  onEliminar?: (id: string) => void;
}) {
  if (evidencias.length === 0) {
    return (
      <p className="text-[11.5px] text-muted">Sin evidencias adjuntas.</p>
    );
  }
  return (
    <ul className="space-y-[6px]">
      {evidencias.map((e) => (
        <li
          key={e.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-pj-sm border border-linea bg-superficie px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium text-tinta">
              {e.nombreArchivo}
            </div>
            <div className="text-[10.5px] text-muted">
              {fmtBytes(e.tamanioBytes)} · {fmtFechaCorta(e.fecha)}
            </div>
          </div>
          <div className="flex flex-none items-center gap-[10px]">
            {e.tieneArchivo ? (
              <a
                href={`/api/v1/evidencias/${e.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-pj-sm border border-azul-line bg-azul-soft px-[9px] py-[4px] text-[11px] font-semibold text-azul-d hover:bg-azul-soft-hover"
              >
                Descargar
              </a>
            ) : e.rutaOUrl ? (
              <a
                href={e.rutaOUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-azul-d underline"
              >
                Ver referencia
              </a>
            ) : null}
            {puedeEliminar ? (
              <button
                type="button"
                onClick={() => onEliminar?.(e.id)}
                className="text-[11px] font-semibold text-sem-rojo hover:underline"
              >
                Eliminar
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Selector de archivo + botón "Adjuntar". La selección se limpia SOLO
 *  cuando la subida tuvo éxito (un fallo no obliga a re-seleccionar). */
function SubidorEvidencia({
  disabled,
  onSubir,
}: {
  disabled: boolean;
  onSubir: (formData: FormData) => Promise<ResultadoAccion>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-[10px] border-t border-linea-2 pt-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.docx,.csv"
        disabled={disabled}
        className="block max-w-full flex-1 text-[11.5px] text-muted file:mr-2 file:rounded-pj-sm file:border file:border-linea file:bg-superficie file:px-2 file:py-1 file:text-[11px] disabled:opacity-50"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={async () => {
          const archivo = inputRef.current?.files?.[0];
          if (!archivo) return;
          const formData = new FormData();
          formData.set("archivo", archivo);
          const r = await onSubir(formData);
          if (r.ok && inputRef.current) inputRef.current.value = "";
        }}
        className="tap rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold hover:bg-hover disabled:opacity-50"
      >
        Adjuntar
      </button>
      <span className="w-full text-[10px] text-muted-2">
        PDF, imagen, Excel, Word o CSV · máx. 25 MB
      </span>
    </div>
  );
}

function BotonValidar({
  texto,
  cls,
  disabled,
  onClick,
}: {
  texto: string;
  cls: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-pj border px-4 py-[8px] text-[12.5px] font-semibold disabled:opacity-50",
        cls,
      )}
    >
      {disabled ? <Spinner /> : null}
      {texto}
    </button>
  );
}

/** Banda de estado del plazo de carga del indicador seleccionado. */
/**
 * Aviso de carga cerrada (vencida o cerrada por la DGPD). Solo se muestra en
 * ese caso: el plazo vigente ya figura en el encabezado de la pantalla.
 */
function AvisoCargaCerrada({
  ventana,
  puedeValidar,
}: {
  ventana: VentanaDTO;
  puedeValidar: boolean;
}) {
  if (ventana.estado !== "CERRADA") return null;
  const fecha = ventana.fechaLimite ? fmtFechaCorta(ventana.fechaLimite) : null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-pj-sm border border-sem-rojo-border bg-sem-rojo-bg px-3 py-2 text-[12px] text-sem-rojo-fg">
      <Lock className="h-4 w-4 flex-none" />
      <b>Carga cerrada</b>
      <span>
        {ventana.cierreManual
          ? "La DGPD cerró la carga de este indicador."
          : `El plazo venció el ${fecha ?? "—"}.`}
        {ventana.motivo ? ` “${ventana.motivo}”` : ""}
      </span>
      <span className="text-sem-rojo-fg/80">
        {puedeValidar
          ? "Como validador puede cargar igualmente o habilitar la carga."
          : "Solicite una prórroga a la DGPD para volver a cargar."}
      </span>
    </div>
  );
}
