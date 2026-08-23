"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarIndicadorAction,
  type ResultadoAdmin,
} from "@/server/services/admin-actions";
import { Card, CardHeader, Tag } from "@/ui/components/card";
import { Spinner } from "@/ui/components/spinner";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { ANIOS_PEI } from "@/shared/constants";
import { cn, fmtNum } from "@/lib/utils";

export interface MatrizItemDTO {
  codigo: number;
  nombre: string;
  descripcion: string | null;
  formula: string | null;
  oeCodigo: string;
  aeCodigo: string | null;
  sentido: "ASC" | "DESC";
  unidad: "PORCENTAJE" | "NUMERO" | "PUNTAJE" | "INDICE";
  lineaBase: number | null;
  anioLineaBase: number | null;
  peso: number;
  activo: boolean;
  metas: { anio: number; valorMeta: number | null }[];
}

interface FormMatriz {
  nombre: string;
  descripcion: string;
  formula: string;
  sentido: "ASC" | "DESC";
  unidad: MatrizItemDTO["unidad"];
  lineaBase: string;
  anioLineaBase: string;
  peso: string;
  activo: boolean;
  metas: Record<number, string>;
}

function formDe(it: MatrizItemDTO): FormMatriz {
  const metas: Record<number, string> = {};
  for (const a of ANIOS_PEI) {
    const m = it.metas.find((x) => x.anio === a);
    metas[a] = m?.valorMeta != null ? String(m.valorMeta) : "";
  }
  return {
    nombre: it.nombre,
    descripcion: it.descripcion ?? "",
    formula: it.formula ?? "",
    sentido: it.sentido,
    unidad: it.unidad,
    lineaBase: it.lineaBase != null ? String(it.lineaBase) : "",
    anioLineaBase: it.anioLineaBase != null ? String(it.anioLineaBase) : "",
    peso: String(it.peso),
    activo: it.activo,
    metas,
  };
}

export function MatrizView({ items }: { items: MatrizItemDTO[] }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number | null>(items[0]?.codigo ?? null);
  const item = items.find((i) => i.codigo === sel);
  const [form, setForm] = useState<FormMatriz | null>(
    item ? formDe(item) : null,
  );
  const [toast, setToast] = useState<ResultadoAdmin | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        !t || String(i.codigo).includes(t) || i.nombre.toLowerCase().includes(t),
    );
  }, [items, q]);

  const seleccionar = (codigo: number) => {
    setSel(codigo);
    const it = items.find((i) => i.codigo === codigo);
    setForm(it ? formDe(it) : null);
    setToast(null);
  };

  const guardar = () => {
    if (!item || !form) return;
    start(async () => {
      const r = await actualizarIndicadorAction({
        codigo: item.codigo,
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        formula: form.formula || null,
        sentido: form.sentido,
        unidad: form.unidad,
        lineaBase: form.lineaBase === "" ? null : Number(form.lineaBase),
        anioLineaBase:
          form.anioLineaBase === "" ? null : Number(form.anioLineaBase),
        peso: Number(form.peso) || 1,
        activo: form.activo,
        metas: ANIOS_PEI.map((anio) => ({
          anio,
          valorMeta: form.metas[anio] === "" ? null : Number(form.metas[anio]),
        })),
      });
      setToast(r);
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader title="Indicadores" meta={`${filtrados.length} de ${items.length}`} />
        <div className="border-b border-linea-2 p-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="w-full rounded-pj border border-linea bg-superficie px-[9px] py-[7px] text-[12.5px]"
          />
        </div>
        <div className="scroll-pj max-h-[300px] overflow-y-auto md:max-h-[600px]">
          {filtrados.map((i) => (
            <button
              key={i.codigo}
              type="button"
              onClick={() => seleccionar(i.codigo)}
              className={cn(
                "block w-full border-b border-linea-2 px-[14px] py-[9px] text-left hover:bg-hover",
                i.codigo === sel && "bg-azul-soft shadow-[inset_3px_0_0_rgb(var(--c-azul))]",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-serif text-[12.5px] font-semibold text-azul-d">
                  {i.codigo}
                </span>
                <span className="flex items-center gap-1">
                  <Tag>{i.oeCodigo}</Tag>
                  {!i.activo ? <Tag>inactivo</Tag> : null}
                </span>
              </span>
              <span className="mt-[2px] block text-[11.5px] leading-tight text-tinta">
                {i.nombre.length > 70 ? `${i.nombre.slice(0, 70)}…` : i.nombre}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title={item ? `Editar indicador ${item.codigo}` : "Seleccione un indicador"}
          meta={item ? (item.aeCodigo ?? "Nivel OE") : ""}
        />
        <div className="p-4">
          {item && form ? (
            <fieldset disabled={pendiente} className="space-y-[14px]">
              <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                Nombre
                <textarea
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full resize-y rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                />
              </label>
              <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                Descripción
                <textarea
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full resize-y rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
                <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                  Sentido
                  <select
                    value={form.sentido}
                    onChange={(e) =>
                      setForm({ ...form, sentido: e.target.value as "ASC" | "DESC" })
                    }
                    className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                  >
                    <option value="ASC">Ascendente ↑</option>
                    <option value="DESC">Descendente ↓</option>
                  </select>
                </label>
                <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                  Unidad
                  <select
                    value={form.unidad}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        unidad: e.target.value as MatrizItemDTO["unidad"],
                      })
                    }
                    className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                  >
                    <option value="PORCENTAJE">Porcentaje</option>
                    <option value="NUMERO">Número</option>
                    <option value="PUNTAJE">Puntaje</option>
                    <option value="INDICE">Índice</option>
                  </select>
                </label>
                <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                  Línea base (vacío = a determinar)
                  <input
                    type="number"
                    step="any"
                    value={form.lineaBase}
                    onChange={(e) =>
                      setForm({ ...form, lineaBase: e.target.value })
                    }
                    className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px]"
                  />
                </label>
                <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                  Año de línea base
                  <input
                    type="number"
                    value={form.anioLineaBase}
                    onChange={(e) =>
                      setForm({ ...form, anioLineaBase: e.target.value })
                    }
                    className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px]"
                  />
                </label>
              </div>
              <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                Fórmula
                <input
                  value={form.formula}
                  onChange={(e) => setForm({ ...form, formula: e.target.value })}
                  className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
                />
              </label>

              <div>
                <div className="mb-1 text-2xs uppercase tracking-[.06em] text-muted">
                  Metas anuales 2026–2030 (vacío = sin meta / concluido)
                </div>
                <div className="grid grid-cols-1 gap-2 xs:grid-cols-3 md:grid-cols-5">
                  {ANIOS_PEI.map((a) => (
                    <label key={a} className="text-[11px] text-muted">
                      {a}
                      <input
                        type="number"
                        step="any"
                        value={form.metas[a]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            metas: { ...form.metas, [a]: e.target.value },
                          })
                        }
                        className="tnum mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-2 text-right text-[12.5px] text-tinta"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="block text-2xs uppercase tracking-[.06em] text-muted">
                  Peso en agregaciones
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={form.peso}
                    onChange={(e) => setForm({ ...form, peso: e.target.value })}
                    className="tnum mt-1 block w-24 rounded-pj border border-linea bg-superficie px-2 py-2 text-[12.5px] text-tinta"
                  />
                </label>
                <label className="mt-4 inline-flex items-center gap-2 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className="h-4 w-4 accent-azul"
                  />
                  Indicador activo
                </label>
              </div>

              <div className="flex flex-col items-start gap-3 border-t border-linea-2 pt-4 xs:flex-row xs:items-center">
                <button
                  type="button"
                  onClick={guardar}
                  className="tap inline-flex w-full flex-none items-center justify-center gap-2 rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50 xs:w-auto"
                >
                  {pendiente ? <Spinner /> : null}
                  {pendiente ? "Guardando…" : "Guardar cambios"}
                </button>
                <span className="text-[11.5px] text-muted">
                  Base actual: {item.lineaBase === null ? "a determinar" : fmtNum(item.lineaBase)} · Los cambios recalculan el tablero.
                </span>
              </div>
            </fieldset>
          ) : (
            <p className="py-8 text-center text-muted">
              Seleccione un indicador para editar la matriz.
            </p>
          )}
        </div>
      </Card>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
      />
    </div>
  );
}
