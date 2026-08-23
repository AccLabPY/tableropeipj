"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDbEnv } from "@/server/db/switch-action";
import { cn } from "@/lib/utils";

/**
 * Switch de entorno de datos (solo ADMIN). Cambia entre la base de
 * PRODUCCIÓN (peipj) y la de PRUEBA (peipj_test) para la sesión del admin.
 */
export function DbSwitch({ actual }: { actual: "prod" | "test" }) {
  const [confirmando, setConfirmando] = useState<"prod" | "test" | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const cambiar = (env: "prod" | "test") =>
    start(async () => {
      await setDbEnv(env);
      setConfirmando(null);
      router.refresh();
    });

  return (
    <div>
      <div className="mb-3 flex flex-col gap-[10px] sm:flex-row">
        {(
          [
            ["prod", "Producción (peipj)", "datos oficiales"],
            ["test", "Prueba (peipj_test)", "datos mockup de demostración"],
          ] as const
        ).map(([env, label, desc]) => (
          <button
            key={env}
            type="button"
            disabled={pendiente || actual === env}
            onClick={() => setConfirmando(env)}
            className={cn(
              "flex-1 rounded-pj border px-4 py-3 text-left",
              actual === env
                ? "border-azul bg-azul-soft"
                : "border-linea bg-superficie hover:bg-hover",
            )}
          >
            <span className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  env === "prod" ? "bg-sem-verde" : "bg-sem-ambar",
                )}
              />
              {label}
              {actual === env ? (
                <span className="rounded-chip bg-azul px-2 text-[10px] text-white">
                  activo
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-[11.5px] text-muted">{desc}</span>
          </button>
        ))}
      </div>
      {confirmando ? (
        <div className="rounded-pj border border-sem-ambar-border bg-sem-ambar-bg p-3 text-[12.5px]">
          <p className="mb-2">
            ¿Cambiar su sesión al entorno{" "}
            <b>{confirmando === "prod" ? "PRODUCCIÓN" : "PRUEBA"}</b>? Solo
            afecta a su usuario administrador; los demás usuarios siguen viendo
            el entorno por defecto.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={() => cambiar(confirmando)}
              className="tap rounded-pj border border-azul-d bg-azul px-3 py-[6px] text-[12px] font-semibold text-white hover:bg-azul-d disabled:opacity-50"
            >
              {pendiente ? "Cambiando…" : "Confirmar cambio"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(null)}
              className="tap rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[12px] font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
