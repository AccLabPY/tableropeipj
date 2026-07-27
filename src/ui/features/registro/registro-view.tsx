"use client";

import { useMemo, useState, useTransition } from "react";
import { calcularCumplimiento, semaforo as clasificar } from "@/domain";
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
  numerador: string;
  denominador: string;
  valor: string;
  nivel: string;
  fuente: string;
  obs: string;
}

function formDesdeItem(it: RegistroItemDTO | undefined): FormState {
  const m = it?.medicion;
  return {
    numerador: m?.numerador != null ? String(m.numerador) : "",
    denominador: m?.denominador != null ? String(m.denominador) : "",
    valor:
      m?.valorObservado != null && m.numerador == null && m.nivelEscala == null
        ? String(m.valorObservado)
        : "",
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
  const modoEscala = !!item?.esEscala && item.escala.length > 0;
  const modoPct = item?.unidad === "PORCENTAJE" && !modoEscala;

  /** Valor observado derivado del formulario (misma lógica que el backend). */
  const valorDerivado = useMemo(() => {
    if (!item) return null;
    if (modoEscala) {
      const n = parseInt(form.nivel, 10);
      const esc = item.escala.find((e) => e.nivel === n);
      return esc ? esc.pctMax : null;
    }
    if (modoPct) {
      const num = parseFloat(form.numerador);
      const den = parseFloat(form.denominador);
      if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0)
        return (num / den) * 100;
      const directo = parseFloat(form.valor);
      return Number.isNaN(directo) ? null : directo;
    }
    const v = parseFloat(form.valor);
    return Number.isNaN(v) ? null : v;
  }, [item, form, modoEscala, modoPct]);

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

  const inputPayload = () =>
    item && {
      indicadorCodigo: item.codigo,
      anio: data.anio,
      numerador: form.numerador === "" ? null : Number(form.numerador),
      denominador: form.denominador === "" ? null : Number(form.denominador),
      nivelEscala: form.nivel === "" ? null : Number(form.nivel),
      valorObservado:
        modoEscala || (modoPct && form.numerador !== "")
          ? null
          : form.valor === ""
            ? null
            : Number(form.valor),
      fuente: form.fuente || null,
      observaciones: form.obs || null,
    };

  const ejecutar = (fn: () => Promise<ResultadoAccion>) =>
    startTransition(async () => setToast(await fn()));

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_1fr]">
      {/* Worklist */}
      <Card>
        <CardHeader
          title="Indicadores a cargo"
          meta={`${data.items.length} del período`}
        />
        <div className="scroll-pj max-h-[300px] overflow-y-auto lg:max-h-[640px]">
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
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-pj border border-linea bg-linea lg:grid-cols-4">
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
                    ) : modoPct ? (
                      <>
                        <Campo
                          label="Numerador"
                          value={form.numerador}
                          onChange={(v) => setForm({ ...form, numerador: v })}
                        />
                        <Campo
                          label="Denominador"
                          value={form.denominador}
                          onChange={(v) => setForm({ ...form, denominador: v })}
                        />
                      </>
                    ) : (
                      <Campo
                        label="Valor reportado"
                        value={form.valor}
                        onChange={(v) => setForm({ ...form, valor: v })}
                      />
                    )}
                    <label
                      className={cn(
                        "text-2xs uppercase tracking-[.06em] text-muted",
                        modoEscala || !modoPct ? "" : "sm:col-span-2",
                      )}
                    >
                      Valor observado (calculado)
                      <input
                        readOnly
                        value={
                          valorDerivado === null
                            ? ""
                            : `${fmtNum(valorDerivado)}${item.unidad === "PORCENTAJE" ? " %" : ""}`
                        }
                        className="mt-1 block w-full rounded-pj border border-linea bg-[#F7F9FB] px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
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
                  <b className="block font-serif text-[20px] text-tinta">
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
                <div className="mt-[18px] flex gap-[10px] border-t border-linea-2 pt-4">
                  <button
                    type="button"
                    disabled={pendiente || valorDerivado === null}
                    onClick={() =>
                      ejecutar(() => enviarMedicionAction(inputPayload()))
                    }
                    className="rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50"
                  >
                    {pendiente ? "Procesando…" : "Enviar a validación"}
                  </button>
                  <button
                    type="button"
                    disabled={pendiente || valorDerivado === null}
                    onClick={() =>
                      ejecutar(() => guardarBorradorAction(inputPayload()))
                    }
                    className="rounded-pj border border-linea bg-superficie px-4 py-[9px] text-[12.5px] font-semibold hover:bg-[#F7F9FB] disabled:opacity-50"
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
    <div className={cn("bg-superficie px-3 py-[10px]", ancho && "col-span-2 lg:col-span-4")}>
      <div className="text-[10px] uppercase tracking-[.06em] text-muted-2">
        {label}
      </div>
      <div className="mt-[3px] text-[13px]">{valor}</div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-2xs uppercase tracking-[.06em] text-muted">
      {label}
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
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
    <div className="mt-4 flex flex-col gap-2 min-[480px]:flex-row min-[480px]:items-center min-[480px]:gap-0">
      {pasos.map((p, ix) => {
        const n = ix + 1;
        const done = fase > n;
        const now = fase === n;
        return (
          <div key={p} className="flex items-center min-[480px]:flex-1 min-[480px]:last:flex-none">
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
              <span className="mx-[10px] hidden h-[1.5px] min-w-[24px] flex-1 bg-linea min-[480px]:block" />
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
