import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-pj border-[1.5px] border-white/55">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <path d="M12 3v16" />
              <path d="M6 20h12" />
              <path d="M4 8h16" />
              <path d="M4 8l-2 5a3 3 0 0 0 6 0z" />
              <path d="M20 8l-2 5a3 3 0 0 0 6 0z" />
            </svg>
          </div>
          <h1 className="font-serif text-[20px]">
            Poder Judicial del Paraguay
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[.16em] text-[#B8CADA]">
            Plataforma de Seguimiento · PEI 2026–2030
          </p>
        </div>
        <div className="rounded-pj border border-linea bg-superficie p-6 shadow-card">
          <h2 className="mb-4 font-serif text-[16px] font-semibold">
            Iniciar sesión
          </h2>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-[11px] text-[#B8CADA]">
          Acceso restringido a magistrados y funcionarios autorizados.
        </p>
      </div>
    </div>
  );
}
