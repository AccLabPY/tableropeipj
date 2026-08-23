"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  eliminarUmbralAction,
  guardarUmbralAction,
  type ResultadoAdmin,
} from "@/server/services/admin-actions";
import type { UmbralRow } from "@/server/repositories/umbral.repo";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { Spinner } from "@/ui/components/spinner";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { cn } from "@/lib/utils";

type Scope = "GLOBAL" | "OE" | "AE" | "INDICADOR";

export interface CatalogosEscalas {
  oes: { codigo: string; nombre: string }[];
  aes: { codigo: string; nombre: string; oeCodigo: string }[];
  indicadores: { codigo: number; nombre: string; aeCodigo: string | null; oeCodigo: string }[];
}

export function EscalasView({
  umbrales,
  catalogos,
}: {
  umbrales: UmbralRow[];
  catalogos: CatalogosEscalas;
}) {
  const [scope, setScope] = useState<Scope>("GLOBAL");
  const [entidad, setEntidad] = useState("GLOBAL");
  const [verde, setVerde] = useState(90);
  const [amarillo, setAmarillo] = useState(70);
  const [toast, setToast] = useState<ResultadoAdmin | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const mapa = useMemo(() => {
    const m = new Map<string, UmbralRow>();
    umbrales.forEach((u) => m.set(`${u.scope}:${u.entidad}`, u));
    return m;
  }, [umbrales]);

  const heredado = useMemo(() => {
    if (scope === "GLOBAL") return null;
    if (scope === "OE")
      return mapa.get("GLOBAL:GLOBAL") ?? null;
    if (scope === "AE") {
      const ae = catalogos.aes.find((a) => a.codigo === entidad);
      return (
        (ae && mapa.get(`OE:${ae.oeCodigo}`)) ??
        mapa.get("GLOBAL:GLOBAL") ??
        null
      );
    }
    const ind = catalogos.indicadores.find((i) => String(i.codigo) === entidad);
    if (!ind) return mapa.get("GLOBAL:GLOBAL") ?? null;
    return (
      (ind.aeCodigo && mapa.get(`AE:${ind.aeCodigo}`)) ||
      mapa.get(`OE:${ind.oeCodigo}`) ||
      mapa.get("GLOBAL:GLOBAL") ||
      null
    );
  }, [scope, entidad, mapa, catalogos]);

  const propia = mapa.get(`${scope}:${entidad}`);

  const elegirScope = (s: Scope) => {
    setScope(s);
    const primera =
      s === "GLOBAL"
        ? "GLOBAL"
        : s === "OE"
          ? catalogos.oes[0]?.codigo ?? ""
          : s === "AE"
            ? catalogos.aes[0]?.codigo ?? ""
            : String(catalogos.indicadores[0]?.codigo ?? "");
    setEntidad(primera);
    const eff =
      mapa.get(`${s}:${primera}`) ?? mapa.get("GLOBAL:GLOBAL") ?? null;
    if (eff) {
      setVerde(eff.verde);
      setAmarillo(eff.amarillo);
    }
    setToast(null);
  };

  const elegirEntidad = (e: string) => {
    setEntidad(e);
    const eff = mapa.get(`${scope}:${e}`) ?? heredado;
    if (eff) {
      setVerde(eff.verde);
      setAmarillo(eff.amarillo);
    }
    setToast(null);
  };

  const guardar = () =>
    start(async () => {
      const r = await guardarUmbralAction({ scope, entidad, verde, amarillo });
      setToast(r);
      router.refresh();
    });

  const eliminar = (s: string, e: string) =>
    start(async () => {
      const r = await eliminarUmbralAction(s, e);
      setToast(r);
      router.refresh();
    });

  const amarilloOk = Math.min(amarillo, verde - 1);

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Definir umbrales" meta="verde ≥ · amarillo ≥ · rojo <" />
        <CardBody>
          <div className="mb-3 text-2xs uppercase tracking-[.06em] text-muted">
            Nivel de aplicación
          </div>
          <div className="mb-4 flex flex-wrap gap-[6px]">
            {(["GLOBAL", "OE", "AE", "INDICADOR"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => elegirScope(s)}
                className={cn(
                  "rounded-pj border px-[13px] py-[7px] text-[12.5px] font-semibold",
                  scope === s
                    ? "border-azul-line bg-azul-soft text-azul-d"
                    : "border-linea bg-superficie text-muted hover:bg-hover",
                )}
              >
                {s === "GLOBAL"
                  ? "Global"
                  : s === "OE"
                    ? "Objetivo"
                    : s === "AE"
                      ? "Acción"
                      : "Indicador"}
              </button>
            ))}
          </div>

          {scope !== "GLOBAL" ? (
            <label className="mb-4 block text-2xs uppercase tracking-[.06em] text-muted">
              {scope === "OE"
                ? "Objetivo estratégico"
                : scope === "AE"
                  ? "Acción estratégica"
                  : "Indicador"}
              <select
                value={entidad}
                onChange={(e) => elegirEntidad(e.target.value)}
                className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-2 py-2 text-[12.5px] normal-case tracking-normal text-tinta"
              >
                {scope === "OE"
                  ? catalogos.oes.map((o) => (
                      <option key={o.codigo} value={o.codigo}>
                        {o.codigo} · {o.nombre.slice(0, 70)}
                      </option>
                    ))
                  : scope === "AE"
                    ? catalogos.aes.map((a) => (
                        <option key={a.codigo} value={a.codigo}>
                          {a.codigo} · {a.nombre.slice(0, 70)}
                        </option>
                      ))
                    : catalogos.indicadores.map((i) => (
                        <option key={i.codigo} value={String(i.codigo)}>
                          {i.codigo} · {i.nombre.slice(0, 70)}
                        </option>
                      ))}
              </select>
            </label>
          ) : null}

          <div className="my-[14px] flex flex-col gap-1 xs:flex-row xs:items-center xs:gap-3">
            <label className="text-[11px] xs:w-[110px] sm:w-[150px] sm:text-[12px]">
              Umbral verde (≥)
            </label>
            <div className="flex flex-1 items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                value={verde}
                onChange={(e) => setVerde(Number(e.target.value))}
                className="min-w-0 flex-1 accent-azul"
              />
              <span className="tnum w-[52px] flex-none text-right font-serif font-semibold">
                {verde}%
              </span>
            </div>
          </div>
          <div className="my-[14px] flex flex-col gap-1 xs:flex-row xs:items-center xs:gap-3">
            <label className="text-[11px] xs:w-[110px] sm:w-[150px] sm:text-[12px]">
              Umbral amarillo (≥)
            </label>
            <div className="flex flex-1 items-center gap-3">
              <input
                type="range"
                min={0}
                max={99}
                value={amarilloOk}
                onChange={(e) => setAmarillo(Number(e.target.value))}
                className="min-w-0 flex-1 accent-azul"
              />
              <span className="tnum w-[52px] flex-none text-right font-serif font-semibold">
                {amarilloOk}%
              </span>
            </div>
          </div>

          {/* Preview de banda */}
          <div className="mb-1 mt-2 flex h-[26px] overflow-hidden rounded-pj-sm border border-linea">
            <div
              className="grid place-items-center overflow-hidden text-[11px] font-semibold text-white"
              style={{ width: `${amarilloOk}%`, background: SEM_COLORS.ROJO }}
            >
              Rojo
            </div>
            <div
              className="grid place-items-center overflow-hidden text-[11px] font-semibold text-white"
              style={{
                width: `${verde - amarilloOk}%`,
                background: SEM_COLORS.AMARILLO,
              }}
            >
              Amarillo
            </div>
            <div
              className="grid flex-1 place-items-center text-[11px] font-semibold text-white"
              style={{ background: SEM_COLORS.VERDE }}
            >
              Verde
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-muted-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>

          <p className="mt-3 text-[11.5px] leading-[1.4] text-muted">
            {scope === "GLOBAL" ? (
              <>Escala global por defecto: se aplica a todo lo que no tenga una propia.</>
            ) : propia ? (
              <>
                <span className="mr-[5px] rounded-pj-sm bg-azul-soft px-[7px] py-[1px] text-2xs text-azul-d">
                  propia
                </span>
                Escala específica definida para {entidad}.
              </>
            ) : (
              <>
                <span className="mr-[5px] rounded-pj-sm bg-sem-gris-bg px-[7px] py-[1px] text-2xs text-muted">
                  heredado
                </span>
                {entidad} usa hoy la escala {heredado ? `${heredado.scope === "GLOBAL" ? "global" : heredado.scope + " " + heredado.entidad} (verde ≥ ${heredado.verde}%, amarillo ≥ ${heredado.amarillo}%)` : "global"}. Guarde para fijarle una propia.
              </>
            )}
          </p>

          <div className="mt-4 flex flex-col gap-[10px] border-t border-linea-2 pt-4 xs:flex-row xs:flex-wrap">
            <button
              type="button"
              disabled={pendiente}
              onClick={guardar}
              className="tap inline-flex w-full items-center justify-center gap-2 rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50 xs:w-auto"
            >
              {pendiente ? <Spinner /> : null}
              {pendiente ? "Guardando…" : "Guardar escala"}
            </button>
            {scope !== "GLOBAL" && propia ? (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => eliminar(scope, entidad)}
                className="tap w-full rounded-pj border border-linea bg-superficie px-4 py-[9px] text-[12.5px] font-semibold hover:bg-hover disabled:opacity-50 xs:w-auto"
              >
                Restablecer a heredado
              </button>
            ) : null}
          </div>
          <ModalResultado
            abierto={toast !== null}
            tipo={toast?.ok ? "exito" : "error"}
            mensaje={toast?.mensaje}
            alCerrar={() => setToast(null)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Escalas configuradas"
          meta="lo específico prevalece sobre lo heredado"
        />
        <CardBody className="p-0">
          <DataTable
            celdaClassName="px-4 py-2"
            columnas={[
              {
                key: "ambito",
                header: "Ámbito",
                movil: "titulo",
                tdClassName: "text-[12.5px]",
                cell: (u) =>
                  u.scope === "GLOBAL"
                    ? "Global (por defecto)"
                    : u.scope === "OE"
                      ? `Objetivo ${u.entidad}`
                      : u.scope === "AE"
                        ? `Acción ${u.entidad}`
                        : `Indicador ${u.entidad}`,
              },
              {
                key: "verde",
                header: "Verde ≥",
                align: "right",
                tnum: true,
                cell: (u) => `${u.verde}%`,
              },
              {
                key: "amarillo",
                header: "Amarillo ≥",
                align: "right",
                tnum: true,
                cell: (u) => `${u.amarillo}%`,
              },
              {
                key: "rojo",
                header: "Rojo",
                cell: (u) => (
                  <span className="whitespace-nowrap rounded-pj-sm bg-sem-rojo-bg px-2 py-[2px] text-[11px] font-semibold text-sem-rojo-fg">
                    &lt; {u.amarillo}%
                  </span>
                ),
              },
              {
                key: "acciones",
                header: <span className="sr-only">Eliminar</span>,
                movil: "insignia",
                thClassName: "w-10 px-2",
                tdClassName: "px-2 text-center",
                cell: (u) =>
                  u.scope !== "GLOBAL" ? (
                    <button
                      type="button"
                      title="Eliminar (vuelve a heredar)"
                      disabled={pendiente}
                      onClick={() => eliminar(u.scope, u.entidad)}
                      className="font-bold text-sem-rojo hover:opacity-70"
                    >
                      ✕
                    </button>
                  ) : null,
              },
            ]}
            filas={umbrales}
            keyFila={(u) => `${u.scope}:${u.entidad}`}
            vacio="Sin escalas configuradas."
          />
          <p className="border-t border-linea-2 px-4 py-3 text-[11.5px] text-muted">
            Herencia: el indicador toma su escala; si no tiene, hereda de su
            Acción; luego de su Objetivo; y por último de la Global. Cambiar un
            umbral recalcula los semáforos afectados en todo el tablero.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
