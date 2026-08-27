"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Eye,
  FileWarning,
  History,
  Lock,
  LockOpen,
  Send,
  XCircle,
} from "lucide-react";
import type {
  NotificacionDTO,
  TipoNotificacion,
} from "@/shared/dtos/notificaciones";
import { cn } from "@/lib/utils";

const INTERVALO_MS = 60_000;

const ICONO: Record<
  TipoNotificacion,
  { Icon: typeof Bell; cls: string }
> = {
  CARGA_ENVIADA: { Icon: Send, cls: "bg-azul-soft text-azul" },
  CARGA_EN_REVISION: { Icon: Eye, cls: "bg-sem-ambar-bg text-sem-ambar-fg" },
  CARGA_APROBADA: { Icon: CheckCircle2, cls: "bg-sem-verde-bg text-sem-verde-fg" },
  CARGA_OBSERVADA: { Icon: FileWarning, cls: "bg-sem-ambar-bg text-sem-ambar-fg" },
  CARGA_RECHAZADA: { Icon: XCircle, cls: "bg-sem-rojo-bg text-sem-rojo-fg" },
  CARGA_RECTIFICADA: { Icon: History, cls: "bg-purpura-bg text-purpura" },
  INDICADOR_CRITICO: { Icon: AlertTriangle, cls: "bg-sem-rojo-bg text-sem-rojo-fg" },
  PLAZO_PROXIMO: { Icon: CalendarClock, cls: "bg-sem-ambar-bg text-sem-ambar-fg" },
  PRORROGA_OTORGADA: { Icon: CalendarPlus, cls: "bg-sem-verde-bg text-sem-verde-fg" },
  CARGA_CERRADA: { Icon: Lock, cls: "bg-sem-gris-bg text-muted" },
  CARGA_HABILITADA: { Icon: LockOpen, cls: "bg-azul-soft text-azul" },
};

/** "hace 5 min", "hace 3 h", "ayer", "12/08/2026". */
function fechaRelativa(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Asuncion",
  });
}

/**
 * Campanita de notificaciones del AppBar: badge de no leídas (polling 60 s),
 * dropdown con las últimas notificaciones; el click marca leída y navega al
 * destino (detalle de la carga o ficha del indicador crítico).
 */
export function Campanita() {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<NotificacionDTO[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargado, setCargado] = useState(false);

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/notificaciones?limite=15", {
        cache: "no-store",
      });
      if (!r.ok) return;
      const json = (await r.json()) as {
        data: NotificacionDTO[];
        meta?: { noLeidas?: number };
      };
      setItems(json.data ?? []);
      setNoLeidas(json.meta?.noLeidas ?? 0);
      setCargado(true);
    } catch {
      /* red caída: se reintenta en el próximo tick */
    }
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    refrescar();
    const t = setInterval(refrescar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [refrescar]);

  // Cierre al click afuera / Escape
  useEffect(() => {
    if (!abierto) return;
    const onDoc = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  const marcar = async (body: { id?: string; todas?: true }) => {
    try {
      await fetch("/api/v1/notificaciones/leer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* no bloquear la navegación */
    }
  };

  const abrirNotificacion = (n: NotificacionDTO) => {
    setAbierto(false);
    if (!n.leida) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      setNoLeidas((c) => Math.max(0, c - 1));
      void marcar({ id: n.id });
    }
    router.push(n.url);
  };

  const marcarTodas = () => {
    setItems((xs) => xs.map((x) => ({ ...x, leida: true })));
    setNoLeidas(0);
    void marcar({ todas: true });
  };

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          if (!abierto) void refrescar();
        }}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={
          noLeidas > 0
            ? `Notificaciones: ${noLeidas} sin leer`
            : "Notificaciones"
        }
        className="relative grid h-[34px] w-[34px] flex-none place-items-center rounded-chip border border-white/[.18] bg-white/10 text-white/90 transition-colors hover:bg-white/20"
      >
        <Bell className="h-[17px] w-[17px]" />
        {noLeidas > 0 ? (
          <span className="absolute -right-[5px] -top-[5px] grid h-[17px] min-w-[17px] place-items-center rounded-full bg-marca-3 px-[4px] text-[9.5px] font-bold leading-none text-white shadow-sm">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        ) : null}
      </button>

      {abierto ? (
        <div
          role="menu"
          aria-label="Notificaciones"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-pj border border-linea bg-superficie text-tinta shadow-toast"
        >
          <div className="flex items-center justify-between border-b border-linea-2 bg-zebra px-4 py-[10px]">
            <span className="text-[12.5px] font-bold">Notificaciones</span>
            {noLeidas > 0 ? (
              <button
                type="button"
                onClick={marcarTodas}
                className="text-[11px] font-semibold text-azul hover:underline"
              >
                Marcar todas como leídas
              </button>
            ) : null}
          </div>

          <div className="scroll-pj max-h-[420px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted">
                <Bell className="h-6 w-6 text-muted-2" />
                <p className="text-[12.5px]">
                  {cargado ? "Sin notificaciones por ahora." : "Cargando…"}
                </p>
              </div>
            ) : (
              items.map((n) => {
                const { Icon, cls } = ICONO[n.tipo];
                return (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => abrirNotificacion(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-linea-2 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-hover",
                      !n.leida && "bg-azul-soft/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-[1px] grid h-8 w-8 flex-none place-items-center rounded-full",
                        cls,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[12.5px] leading-snug",
                          n.leida ? "text-tinta" : "font-semibold text-tinta",
                        )}
                      >
                        {n.titulo}
                      </span>
                      {n.cuerpo ? (
                        <span className="mt-[2px] block whitespace-pre-line text-[11.5px] leading-snug text-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow:hidden]">
                          {n.cuerpo}
                        </span>
                      ) : null}
                      <span className="mt-[3px] block text-[10.5px] text-muted-2">
                        {fechaRelativa(n.creadaEn)}
                      </span>
                    </span>
                    {!n.leida ? (
                      <span
                        aria-hidden="true"
                        className="mt-[6px] h-2 w-2 flex-none rounded-full bg-azul"
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
