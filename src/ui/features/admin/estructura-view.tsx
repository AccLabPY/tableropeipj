"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  crearAeAction,
  crearIndicadorAction,
  crearOeAction,
  eliminarEstructuraAction,
  type ResultadoAdmin,
} from "@/server/services/admin-actions";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { Combobox } from "@/ui/components/combobox";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { Spinner } from "@/ui/components/spinner";
import { ANIOS_PEI } from "@/shared/constants";
import { cn } from "@/lib/utils";

export interface NodoOE {
  codigo: string;
  nombre: string;
  acciones: number;
  indicadores: number;
}
export interface NodoAE {
  codigo: string;
  nombre: string;
  oeCodigo: string;
  indicadores: number;
}
export interface NodoIndicador {
  codigo: number;
  nombre: string;
  oeCodigo: string;
  aeCodigo: string | null;
  activo: boolean;
  mediciones: number;
}

type Pestania = "OE" | "AE" | "INDICADOR";

const ROTULO: Record<Pestania, string> = {
  OE: "Objetivos estratégicos",
  AE: "Acciones estratégicas",
  INDICADOR: "Indicadores",
};

const campo =
  "mt-1 block w-full rounded-pj border border-linea bg-superficie px-3 py-2 text-[13px] text-tinta placeholder:text-muted-2";
const etiqueta = "block text-2xs uppercase tracking-[.06em] text-muted";

/**
 * Alta y baja de la estructura del PEI (objetivos, acciones e indicadores).
 * Integridad: OE/AE solo se eliminan sin hijos; un indicador con mediciones
 * se desactiva en lugar de borrarse (conserva la trazabilidad).
 */
export function EstructuraView({
  oes,
  aes,
  indicadores,
  dependencias,
}: {
  oes: NodoOE[];
  aes: NodoAE[];
  indicadores: NodoIndicador[];
  dependencias: { id: number; nombre: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Pestania>("OE");
  const [toast, setToast] = useState<ResultadoAdmin | null>(null);
  const [confirmar, setConfirmar] = useState<{
    tipo: Pestania;
    codigo: string;
    etiqueta: string;
  } | null>(null);
  const [pendiente, start] = useTransition();

  // Formularios
  const [oe, setOe] = useState({ codigo: "", nombre: "" });
  const [ae, setAe] = useState({ codigo: "", nombre: "", oeCodigo: "" });
  const [ind, setInd] = useState({
    codigo: "",
    nombre: "",
    padre: "",
    unidad: "PORCENTAJE",
    sentido: "ASC",
    formula: "(a) / (b) * 100",
    variables: "",
    lineaBase: "",
    dependenciaId: "",
    metas: ANIOS_PEI.map(() => ""),
  });

  const ejecutar = (fn: () => Promise<ResultadoAdmin>) =>
    start(async () => {
      const r = await fn();
      setToast(r);
      if (r.ok) router.refresh();
    });

  const opcionesPadre = [
    ...oes.map((o) => ({
      valor: o.codigo,
      etiqueta: `${o.codigo} — ${o.nombre}`,
      grupo: "Indicador de objetivo",
    })),
    ...aes.map((a) => ({
      valor: a.codigo,
      etiqueta: `${a.codigo} — ${a.nombre}`,
      grupo: `Acciones de ${a.oeCodigo}`,
    })),
  ];

  return (
    <>
      {/* Pestañas */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(ROTULO) as Pestania[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-pj border px-3 py-[7px] text-[12.5px] font-semibold agentes:rounded-chip",
              tab === t
                ? "border-azul bg-azul text-white"
                : "border-linea bg-superficie text-tinta hover:bg-hover",
            )}
          >
            {ROTULO[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Alta */}
        <Card>
          <CardHeader title={`Agregar ${ROTULO[tab].toLowerCase()}`} meta="alta" />
          <CardBody className="space-y-3">
            {tab === "OE" ? (
              <>
                <label className={etiqueta}>
                  Código
                  <input
                    value={oe.codigo}
                    onChange={(e) => setOe({ ...oe, codigo: e.target.value })}
                    placeholder="OE7"
                    className={campo}
                  />
                </label>
                <label className={etiqueta}>
                  Nombre del objetivo
                  <textarea
                    rows={2}
                    value={oe.nombre}
                    onChange={(e) => setOe({ ...oe, nombre: e.target.value })}
                    placeholder="Fortalecer…"
                    className={cn(campo, "normal-case tracking-normal")}
                  />
                </label>
                <BotonAlta
                  pendiente={pendiente}
                  onClick={() => ejecutar(() => crearOeAction(oe))}
                />
              </>
            ) : tab === "AE" ? (
              <>
                <label className={etiqueta}>
                  Objetivo al que pertenece
                  <div className="mt-1">
                    <Combobox
                      opciones={oes.map((o) => ({
                        valor: o.codigo,
                        etiqueta: `${o.codigo} — ${o.nombre}`,
                      }))}
                      valor={ae.oeCodigo}
                      onChange={(v) => setAe({ ...ae, oeCodigo: v })}
                      placeholder="— Seleccionar objetivo —"
                    />
                  </div>
                </label>
                <label className={etiqueta}>
                  Código
                  <input
                    value={ae.codigo}
                    onChange={(e) => setAe({ ...ae, codigo: e.target.value })}
                    placeholder="A.E.1.9"
                    className={campo}
                  />
                </label>
                <label className={etiqueta}>
                  Nombre de la acción
                  <textarea
                    rows={2}
                    value={ae.nombre}
                    onChange={(e) => setAe({ ...ae, nombre: e.target.value })}
                    className={cn(campo, "normal-case tracking-normal")}
                  />
                </label>
                <BotonAlta
                  pendiente={pendiente}
                  onClick={() => ejecutar(() => crearAeAction(ae))}
                />
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                  <label className={etiqueta}>
                    Código
                    <input
                      value={ind.codigo}
                      onChange={(e) => setInd({ ...ind, codigo: e.target.value })}
                      placeholder="1109"
                      className={campo}
                    />
                  </label>
                  <label className={etiqueta}>
                    Unidad
                    <select
                      value={ind.unidad}
                      onChange={(e) => setInd({ ...ind, unidad: e.target.value })}
                      className={campo}
                    >
                      <option value="PORCENTAJE">Porcentaje</option>
                      <option value="NUMERO">Número</option>
                      <option value="PUNTAJE">Puntaje</option>
                      <option value="INDICE">Índice</option>
                    </select>
                  </label>
                </div>
                <label className={etiqueta}>
                  Nombre del indicador
                  <textarea
                    rows={2}
                    value={ind.nombre}
                    onChange={(e) => setInd({ ...ind, nombre: e.target.value })}
                    className={cn(campo, "normal-case tracking-normal")}
                  />
                </label>
                <label className={etiqueta}>
                  Pertenece a
                  <div className="mt-1">
                    <Combobox
                      opciones={opcionesPadre}
                      valor={ind.padre}
                      onChange={(v) => setInd({ ...ind, padre: v })}
                      placeholder="— Objetivo o acción estratégica —"
                    />
                  </div>
                </label>
                <label className={etiqueta}>
                  Dependencia responsable
                  <div className="mt-1">
                    <Combobox
                      opciones={dependencias.map((d) => ({
                        valor: String(d.id),
                        etiqueta: d.nombre,
                      }))}
                      valor={ind.dependenciaId}
                      onChange={(v) => setInd({ ...ind, dependenciaId: v })}
                      placeholder="— Seleccionar dependencia —"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                  <label className={etiqueta}>
                    Sentido
                    <select
                      value={ind.sentido}
                      onChange={(e) => setInd({ ...ind, sentido: e.target.value })}
                      className={campo}
                    >
                      <option value="ASC">Ascendente (más es mejor)</option>
                      <option value="DESC">Descendente (menos es mejor)</option>
                    </select>
                  </label>
                  <label className={etiqueta}>
                    Línea base (vacío = a determinar)
                    <input
                      value={ind.lineaBase}
                      onChange={(e) => setInd({ ...ind, lineaBase: e.target.value })}
                      placeholder="0"
                      className={campo}
                    />
                  </label>
                </div>
                <label className={etiqueta}>
                  Fórmula
                  <input
                    value={ind.formula}
                    onChange={(e) => setInd({ ...ind, formula: e.target.value })}
                    className={cn(campo, "normal-case tracking-normal")}
                  />
                </label>
                <label className={etiqueta}>
                  Variables (una por línea: “(a) descripción”)
                  <textarea
                    rows={2}
                    value={ind.variables}
                    onChange={(e) => setInd({ ...ind, variables: e.target.value })}
                    placeholder={"(a) Casos resueltos\n(b) Casos ingresados"}
                    className={cn(campo, "normal-case tracking-normal")}
                  />
                </label>
                <div>
                  <div className={etiqueta}>Metas 2026–2030</div>
                  <div className="mt-1 grid grid-cols-5 gap-2">
                    {ANIOS_PEI.map((a, i) => (
                      <label key={a} className="text-[10px] text-muted-2">
                        {a}
                        <input
                          value={ind.metas[i]}
                          onChange={(e) => {
                            const metas = [...ind.metas];
                            metas[i] = e.target.value;
                            setInd({ ...ind, metas });
                          }}
                          className="mt-[2px] block w-full rounded-pj-sm border border-linea bg-superficie px-2 py-[6px] text-[12px] text-tinta"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <BotonAlta
                  pendiente={pendiente}
                  onClick={() =>
                    ejecutar(() =>
                      crearIndicadorAction({
                        ...ind,
                        lineaBase: ind.lineaBase === "" ? null : ind.lineaBase,
                        formula: ind.formula || null,
                        variables: ind.variables || null,
                        metas: ANIOS_PEI.map((a, i) => ({
                          anio: a,
                          valorMeta: ind.metas[i] === "" ? null : Number(ind.metas[i]),
                        })),
                      }),
                    )
                  }
                />
              </>
            )}
          </CardBody>
        </Card>

        {/* Listado + baja */}
        <Card>
          <CardHeader
            title={ROTULO[tab]}
            meta={
              tab === "OE"
                ? `${oes.length}`
                : tab === "AE"
                  ? `${aes.length}`
                  : `${indicadores.length}`
            }
          />
          <div className="scroll-pj max-h-[620px] overflow-y-auto">
            {tab === "OE"
              ? oes.map((o) => (
                  <Fila
                    key={o.codigo}
                    titulo={`${o.codigo} — ${o.nombre}`}
                    detalle={`${o.acciones} acciones · ${o.indicadores} indicadores`}
                    bloqueado={o.acciones > 0 || o.indicadores > 0}
                    onEliminar={() =>
                      setConfirmar({ tipo: "OE", codigo: o.codigo, etiqueta: o.codigo })
                    }
                  />
                ))
              : tab === "AE"
                ? aes.map((a) => (
                    <Fila
                      key={a.codigo}
                      titulo={`${a.codigo} — ${a.nombre}`}
                      detalle={`${a.oeCodigo} · ${a.indicadores} indicadores`}
                      bloqueado={a.indicadores > 0}
                      onEliminar={() =>
                        setConfirmar({ tipo: "AE", codigo: a.codigo, etiqueta: a.codigo })
                      }
                    />
                  ))
                : indicadores.map((i) => (
                    <Fila
                      key={i.codigo}
                      titulo={`${i.codigo} — ${i.nombre}`}
                      detalle={`${i.oeCodigo} · ${i.aeCodigo ?? "Nivel OE"} · ${i.mediciones} mediciones${i.activo ? "" : " · INACTIVO"}`}
                      bloqueado={false}
                      onEliminar={() =>
                        setConfirmar({
                          tipo: "INDICADOR",
                          codigo: String(i.codigo),
                          etiqueta: `${i.codigo}${i.mediciones > 0 ? " (se desactivará: tiene mediciones)" : ""}`,
                        })
                      }
                    />
                  ))}
          </div>
        </Card>
      </div>

      {/* Confirmación de baja */}
      {confirmar ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-navy/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-pj border border-linea bg-superficie p-5 shadow-toast">
            <h2 className="font-serif text-[15px] font-bold text-tinta">
              Confirmar eliminación
            </h2>
            <p className="mt-2 text-[13px] text-muted">
              ¿Eliminar <b className="text-tinta">{confirmar.etiqueta}</b>? Esta
              acción modifica la matriz estratégica y afecta a todos los
              tableros.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                className="rounded-pj border border-linea bg-superficie px-3 py-[7px] text-[12px] font-semibold hover:bg-hover agentes:rounded-chip"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => {
                  const c = confirmar;
                  setConfirmar(null);
                  ejecutar(() =>
                    eliminarEstructuraAction({ tipo: c.tipo, codigo: c.codigo }),
                  );
                }}
                className="inline-flex items-center gap-[6px] rounded-pj bg-sem-rojo px-3 py-[7px] text-[12px] font-semibold text-white disabled:opacity-60 agentes:rounded-chip"
              >
                {pendiente ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
      />
    </>
  );
}

function BotonAlta({
  pendiente,
  onClick,
}: {
  pendiente: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={onClick}
      className="tap inline-flex items-center gap-[6px] rounded-pj bg-azul px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-60 agentes:rounded-chip"
    >
      {pendiente ? <Spinner /> : <Plus className="h-4 w-4" />}
      Agregar
    </button>
  );
}

function Fila({
  titulo,
  detalle,
  bloqueado,
  onEliminar,
}: {
  titulo: string;
  detalle: string;
  bloqueado: boolean;
  onEliminar: () => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-linea-2 px-4 py-[10px]">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] leading-snug text-tinta">{titulo}</div>
        <div className="mt-[2px] text-[10.5px] text-muted-2">{detalle}</div>
      </div>
      <button
        type="button"
        onClick={onEliminar}
        title={
          bloqueado
            ? "Tiene elementos dependientes: elimínelos primero"
            : "Eliminar"
        }
        className={cn(
          "grid h-7 w-7 flex-none place-items-center rounded-pj-sm border border-linea text-muted hover:border-sem-rojo-border hover:bg-sem-rojo-bg hover:text-sem-rojo-fg agentes:rounded-chip",
          bloqueado && "opacity-40",
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
