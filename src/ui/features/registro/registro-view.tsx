"use client";

import { useMemo, useState, useTransition } from "react";
import {
  calcularCumplimiento,
  calcularValorObservado,
  formulaLegible,
  semaforo as clasificar,
} from "@/domain";
import type { EstadoWF } from "@/domain/types";
import type { RegistroDTO, RegistroItemDTO } from "@/shared/dtos/registro";
import {
  enviarMedicionAction,
  guardarBorradorAction,
  validarMedicionAction,
  type ResultadoAccion,
} from "@/server/services/registro-actions";
import { Card, CardHeader } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { cn, fmtNum, fmtPct, fmtValor } from "@/lib/utils";

const CHIP: Record<EstadoWF | "PENDIENTE", { label: string; cls: string }> = {
  PENDIENTE: { label: "Pendiente", cls: "bg-sem-gris-bg text-muted" },
  BORRADOR: { label: "Borrador", cls: "bg-sem-ambar-bg text-[#8a6412]" },
  ENVIADO: { label: "Enviado", cls: "bg-azul-soft text-azul-d" },
  EN_REVISION: { label: "En revisión", cls: "bg-azul-soft text-azul-d" },
  OBSERVADO: { label: "Observado", cls: "bg-sem-ambar-bg text-[#8a6412]" },
  APROBADO: { label: "Validado", cls: "bg-sem-verde-bg text-[#1f6a49]" },
  RECHAZADO: { label: "Rechazado", cls: "bg-sem-rojo-bg text-[#8f2f2f]" },
  RECTIFICADO: { label: "Rectificado", cls: "bg-sem-gris-bg text-muted" },
};

const EDITABLES: (EstadoWF | "PENDIENTE")[] = ["PENDIENTE", "BORRADOR", "OBSERVADO"];

interface FormState {
  /** Valores base por clave de variable ("a","b","c" o "valor"), como texto. */
  valores: Record<string, string>;
  nivel: string;
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
    nivel: m?.nivelEscala != null ? String(m.nivelEscala) : "",
    fuente: m?.fuente ?? "",
    obs: m?.observaciones ?? "",
  };
}

export function RegistroView({ data }: { data: RegistroDTO }) {
  const [selCodigo, setSelCodigo] = useState<number | null>(
    data.items[0]?.codigo ?? null,
  );
  const item = data.items.find((i) => i.codigo === selCodigo);
  const [form, setForm] = useState<FormState>(() => formDesdeItem(item));
  const [toast, setToast] = useState<ResultadoAccion | null>(null);
  const [comentario, setComentario] = useState("");
  const [pendiente, startTransition] = useTransition();

  const seleccionar = (codigo: number) => {
    setSelCodigo(codigo);
    setForm(formDesdeItem(data.items.find((i) => i.codigo === codigo)));
    setToast(null);
    setComentario("");
  };

  const estadoWF: EstadoWF | "PENDIENTE" = item?.medicion?.estado ?? "PENDIENTE";
  const editable = data.puedeCargar && EDITABLES.includes(estadoWF);
  const modoEscala = item?.tipoCalculo === "NIVEL_ESCALA";

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
      const n = parseInt(form.nivel, 10);
      const esc = item.escala.find((e) => e.nivel === n);
      return { valor: esc ? esc.pctMax : null, error: undefined };
    }
    const r = calcularValorObservado(item.tipoCalculo, valoresNumericos);
    return { valor: r.valor, error: r.error };
  }, [item, form.nivel, valoresNumericos, modoEscala]);
  const valorDerivado = derivado.valor;

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
      nivelEscala: form.nivel === "" ? null : Number(form.nivel),
      valores: modoEscala || Object.keys(valores).length === 0 ? null : valores,
      fuente: form.fuente || null,
      observaciones: form.obs || null,
    };
  };

  const ejecutar = (fn: () => Promise<ResultadoAccion>) =>
    startTransition(async () => setToast(await fn()));

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
      {/* Worklist */}
      <Card>
        <CardHeader
          title="Indicadores a cargo"
          meta={`${data.items.length} del período`}
        />
        <div className="scroll-pj max-h-[300px] overflow-y-auto md:max-h-[640px]">
          {data.items.map((i) => {
            const chip = CHIP[i.medicion?.estado ?? "PENDIENTE"];
            return (
              <button
                key={i.codigo}
                type="button"
                onClick={() => seleccionar(i.codigo)}
                className={cn(
                  "block w-full border-b border-linea-2 px-[14px] py-[11px] text-left hover:bg-[#F7F9FB]",
                  i.codigo === selCodigo &&
                    "bg-azul-soft shadow-[inset_3px_0_0_#1E6FA8]",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-serif text-[12.5px] font-semibold text-azul-d">
                    {i.codigo}
                  </span>
                  <span
                    className={`rounded-[10px] px-[7px] py-[1px] text-[10px] font-semibold ${chip.cls}`}
                  >
                    {chip.label}
                  </span>
                </span>
                <span className="mt-[3px] block text-[12px] leading-[1.3]">
                  {i.nombre.length > 76 ? `${i.nombre.slice(0, 76)}…` : i.nombre}
                </span>
              </button>
            );
          })}
          {data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-muted">
              Su usuario no tiene indicadores asignados para la carga.
            </p>
          ) : null}
        </div>
      </Card>

      {/* Formulario */}
      <Card>
        <CardHeader
          title={item ? item.nombre : "Seleccione un indicador"}
          meta={item ? `Cód. ${item.codigo} · ${item.aeCodigo ?? "Nivel OE"}` : ""}
        />
        <div className="p-4">
          {item ? (
            <>
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
                      <label className="text-2xs uppercase tracking-[.06em] text-muted sm:col-span-2">
                        Nivel alcanzado (escala del indicador)
                        <select
                          value={form.nivel}
                          onChange={(e) =>
                            setForm({ ...form, nivel: e.target.value })
                          }
                          className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                        >
                          <option value="">— Seleccionar nivel —</option>
                          {item.escala.map((e) => (
                            <option key={e.nivel} value={e.nivel}>
                              Nivel {e.nivel} · {e.descripcion} ({fmtNum(e.pctMax)}
                              %)
                            </option>
                          ))}
                        </select>
                      </label>
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
                            ? "border-[#E7C4C4] bg-sem-rojo-bg text-sem-rojo"
                            : "border-linea bg-[#F7F9FB] text-tinta",
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

              {/* Cumplimiento en vivo */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-pj border border-linea bg-[#FAFBFC] px-4 py-[14px]">
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

              {/* Stepper */}
              <Stepper estado={estadoWF} />

              {/* Mensajes de validación previa */}
              {item.medicion?.validaciones?.length ? (
                <div className="mt-3 space-y-2">
                  {item.medicion.validaciones.slice(0, 2).map((v, ix) => (
                    <p
                      key={ix}
                      className={cn(
                        "rounded-pj-sm px-3 py-2 text-[12px]",
                        v.resultado === "APROBADO" &&
                          "bg-sem-verde-bg text-[#1f6a49]",
                        v.resultado === "OBSERVADO" &&
                          "bg-sem-ambar-bg text-[#8a6412]",
                        v.resultado === "RECHAZADO" &&
                          "bg-sem-rojo-bg text-[#8f2f2f]",
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
                    disabled={pendiente || valorDerivado === null}
                    onClick={() =>
                      ejecutar(() => enviarMedicionAction(inputPayload()))
                    }
                    className="tap w-full rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50 xs:w-auto"
                  >
                    {pendiente ? "Procesando…" : "Enviar a validación"}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente || valorDerivado === null}
                    onClick={() =>
                      ejecutar(() => guardarBorradorAction(inputPayload()))
                    }
                    className="tap w-full rounded-pj border border-linea bg-superficie px-4 py-[9px] text-[12.5px] font-semibold hover:bg-[#F7F9FB] disabled:opacity-50 xs:w-auto"
                  >
                    Guardar borrador
                  </button>
                </div>
              ) : null}
              {data.puedeCargar && !editable && estadoWF !== "APROBADO" ? (
                <p className="mt-3 text-[12px] text-muted">
                  La medición está {CHIP[estadoWF].label.toLowerCase()}: no puede
                  editarse hasta la resolución del validador.
                </p>
              ) : null}

              {/* Panel del validador */}
              {data.puedeValidar &&
              item.medicion &&
              ["ENVIADO", "EN_REVISION"].includes(item.medicion.estado) ? (
                <div className="mt-[18px] rounded-pj border border-azul-line bg-azul-soft p-4">
                  <div className="mb-2 text-[12.5px] font-semibold text-azul-d">
                    Validación DGPD — valor cargado:{" "}
                    {fmtValor(item.medicion.valorObservado, item.unidad)} (v
                    {item.medicion.version})
                  </div>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                    placeholder="Comentario de la validación (obligatorio al observar/rechazar)…"
                    className="mb-3 block w-full resize-y rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px]"
                  />
                  <div className="flex flex-wrap gap-[10px]">
                    <BotonValidar
                      texto="Aprobar"
                      cls="border-[#256e4c] bg-sem-verde text-white hover:opacity-90"
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
                      cls="border-[#a6791b] bg-sem-ambar text-white hover:opacity-90"
                      disabled={pendiente || comentario.trim().length < 5}
                      onClick={() =>
                        ejecutar(() =>
                          validarMedicionAction(item.medicion!.id, {
                            resultado: "OBSERVADO",
                            comentario,
                          }),
                        )
                      }
                    />
                    <BotonValidar
                      texto="Rechazar"
                      cls="border-[#8f2f2f] bg-sem-rojo text-white hover:opacity-90"
                      disabled={pendiente || comentario.trim().length < 5}
                      onClick={() =>
                        ejecutar(() =>
                          validarMedicionAction(item.medicion!.id, {
                            resultado: "RECHAZADO",
                            comentario,
                          }),
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              {/* Toast */}
              {toast ? (
                <p
                  role="status"
                  className={cn(
                    "mt-4 rounded-pj px-3 py-2 text-[12.5px] font-semibold",
                    toast.ok
                      ? "bg-sem-verde-bg text-[#1f6a49]"
                      : "bg-sem-rojo-bg text-[#8f2f2f]",
                  )}
                >
                  {toast.mensaje}
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-8 text-center text-muted">
              Seleccione un indicador de la lista para cargar su avance.
            </p>
          )}
        </div>
      </Card>
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
        "text-2xs uppercase tracking-[.06em] text-muted",
        esDirecta && "sm:col-span-2",
      )}
    >
      <span className="flex items-baseline gap-[6px]">
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
        className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[13px] normal-case tracking-normal text-tinta"
      />
    </label>
  );
}

function Stepper({ estado }: { estado: EstadoWF | "PENDIENTE" }) {
  const fase =
    estado === "APROBADO" || estado === "RECTIFICADO"
      ? 3
      : ["ENVIADO", "EN_REVISION"].includes(estado)
        ? 2
        : 1;
  const pasos = ["Borrador", "Enviado", "Validado por DGPD"];
  return (
    <div className="mt-4 flex flex-col gap-2 xs:flex-row xs:items-center xs:gap-0">
      {pasos.map((p, ix) => {
        const n = ix + 1;
        const done = fase > n;
        const now = fase === n;
        return (
          <div key={p} className="flex items-center xs:flex-1 xs:last:flex-none">
            <div
              className={cn(
                "flex items-center gap-2 text-[12px]",
                done && "text-sem-verde",
                now && "font-semibold text-azul-d",
                !done && !now && "text-muted-2",
              )}
            >
              <span
                className={cn(
                  "grid h-[22px] w-[22px] place-items-center rounded-full border-[1.5px] bg-superficie text-[11px]",
                  done && "border-sem-verde bg-sem-verde text-white",
                  now && "border-azul text-azul",
                  !done && !now && "border-linea",
                )}
              >
                {done ? "✓" : n}
              </span>
              {p}
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
        "rounded-pj border px-4 py-[8px] text-[12.5px] font-semibold disabled:opacity-50",
        cls,
      )}
    >
      {texto}
    </button>
  );
}
