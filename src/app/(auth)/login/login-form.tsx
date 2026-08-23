"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { loginAction, type EstadoLogin } from "@/server/auth/actions";
import { cn } from "@/lib/utils";

type Variante = "clasico" | "agentes";

function BotonEntrar({ variante }: { variante: Variante }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "tap w-full text-white disabled:opacity-60",
        variante === "agentes"
          ? "mt-1 h-[52px] rounded-chip bg-accion text-[14px] font-bold shadow-[0_8px_17px_rgba(218,64,121,.18)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_11px_24px_rgba(218,64,121,.26)] active:translate-y-0"
          : "rounded-pj border border-azul-d bg-azul px-4 py-[10px] text-[13px] font-semibold hover:bg-azul-d",
      )}
    >
      {pending ? "Verificando…" : "Iniciar sesión"}
    </button>
  );
}

/**
 * Formulario de acceso (server action). `variante="agentes"`: campos con
 * icono, fondo suave y botón para mostrar/ocultar la contraseña.
 */
export function LoginForm({ variante = "clasico" }: { variante?: Variante }) {
  const [estado, accion] = useFormState<EstadoLogin, FormData>(loginAction, {});
  const [verPwd, setVerPwd] = useState(false);
  const agentes = variante === "agentes";

  const etiqueta = agentes
    ? "mb-2 block text-[11.5px] font-semibold uppercase tracking-[.055em] text-muted"
    : "mb-1 block text-[10.5px] uppercase tracking-[.06em] text-muted";
  const campoAgentes =
    "flex h-[50px] items-center gap-[14px] rounded-[15px] border border-transparent bg-navy/[.045] px-4 text-muted transition-[background,border-color,box-shadow] hover:bg-navy/[.06] focus-within:border-azul/75 focus-within:bg-superficie focus-within:text-azul focus-within:shadow-[0_0_0_4px_rgb(var(--c-azul)/.09)]";
  const inputAgentes =
    "min-w-0 flex-1 bg-transparent p-0 text-[14px] text-tinta outline-none placeholder:text-muted-2";
  const inputClasico =
    "w-full rounded-pj border border-linea bg-superficie px-3 py-[9px] text-[13px]";

  return (
    <form action={accion} className={agentes ? "space-y-[19px]" : "space-y-4"}>
      <div>
        <label htmlFor="email" className={etiqueta}>
          Correo institucional
        </label>
        {agentes ? (
          <div className={campoAgentes}>
            <Mail className="h-[19px] w-[19px] flex-none" strokeWidth={1.8} aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="nombre@pj.gov.py"
              className={inputAgentes}
            />
          </div>
        ) : (
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="usuario@pj.gov.py"
            className={inputClasico}
          />
        )}
      </div>
      <div>
        <label htmlFor="password" className={etiqueta}>
          Contraseña
        </label>
        {agentes ? (
          <div className={campoAgentes}>
            <LockKeyhole className="h-[19px] w-[19px] flex-none" strokeWidth={1.8} aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={verPwd ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Ingresá tu contraseña"
              className={inputAgentes}
            />
            <button
              type="button"
              onClick={() => setVerPwd((v) => !v)}
              aria-label={verPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="-mr-[6px] grid h-[34px] w-[34px] flex-none place-items-center rounded-full text-muted hover:bg-azul/[.07] hover:text-azul"
            >
              {verPwd ? (
                <EyeOff className="h-[19px] w-[19px]" strokeWidth={1.8} />
              ) : (
                <Eye className="h-[19px] w-[19px]" strokeWidth={1.8} />
              )}
            </button>
          </div>
        ) : (
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClasico}
          />
        )}
      </div>
      {estado.error ? (
        <p
          role="alert"
          className="rounded-pj-sm border border-sem-rojo-border bg-sem-rojo-bg px-3 py-2 text-[12px] text-sem-rojo"
        >
          {estado.error}
        </p>
      ) : null}
      <BotonEntrar variante={variante} />
    </form>
  );
}
