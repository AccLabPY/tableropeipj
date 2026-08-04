import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div className="safe-b flex min-h-[100svh] flex-col items-center justify-center gap-6 bg-navy px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center text-white">
          <Image
            src="/brand/logo-csj.png"
            alt="Corte Suprema de Justicia"
            width={140}
            height={140}
            priority
            className="mx-auto mb-3 h-16 w-16 xs:h-[70px] xs:w-[70px]"
          />
          <h1 className="font-serif text-titulo">Poder Judicial del Paraguay</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[.16em] text-[#B8CADA]">
            Plataforma de Seguimiento · PEI 2026–2030
          </p>
        </div>
        <div className="rounded-pj border border-linea bg-superficie p-4 shadow-card sm:p-6">
          <h2 className="mb-4 font-serif text-[16px] font-semibold">
            Iniciar sesión
          </h2>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-[11px] text-[#B8CADA]">
          Acceso restringido a usuarios autorizados.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 text-center">
        <span className="text-[10px] uppercase leading-tight tracking-[.14em] text-[#8FA6BC]">
          Con el apoyo de
        </span>
        <Image
          src="/brand/logo-pnud-white.svg"
          alt="PNUD Paraguay"
          width={61}
          height={122}
          className="h-9 w-auto"
        />
      </div>
    </div>
  );
}
