"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type EstadoLogin } from "@/server/auth/actions";

function BotonEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="tap w-full rounded-pj border border-azul-d bg-azul px-4 py-[10px] text-[13px] font-semibold text-white hover:bg-azul-d disabled:opacity-60"
    >
      {pending ? "Verificando…" : "Iniciar sesión"}
    </button>
  );
}

export function LoginForm() {
  const [estado, accion] = useFormState<EstadoLogin, FormData>(loginAction, {});
  return (
    <form action={accion} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-[10.5px] uppercase tracking-[.06em] text-muted"
        >
          Correo institucional
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="usuario@pj.gov.py"
          className="w-full rounded-pj border border-linea bg-superficie px-3 py-[9px] text-[13px]"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-[10.5px] uppercase tracking-[.06em] text-muted"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-pj border border-linea bg-superficie px-3 py-[9px] text-[13px]"
        />
      </div>
      {estado.error ? (
        <p
          role="alert"
          className="rounded-pj-sm border border-[#E7C4C4] bg-sem-rojo-bg px-3 py-2 text-[12px] text-sem-rojo"
        >
          {estado.error}
        </p>
      ) : null}
      <BotonEntrar />
    </form>
  );
}
