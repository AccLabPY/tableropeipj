import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ThemeSwitch } from "@/ui/layout/theme-switch";
import { LogoAgentes } from "@/ui/brand/logo-agentes";
import { BlobsFondo } from "@/ui/motion/blobs-fondo";
import { MotionProvider } from "@/ui/motion/motion-provider";
import { TemaProvider } from "@/ui/tema/tema-provider";
import { getTema } from "@/server/tema/tema";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const tema = await getTema();
  if (tema === "agentes") return <LoginAgentes />;
  return <LoginClasico />;
}

/** Login institucional (navy, Georgia, escudo CSJ). */
function LoginClasico() {
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
          <p className="mt-1 text-[11px] uppercase tracking-[.16em] text-on-marca">
            Plataforma de Seguimiento · PEI 2026–2030
          </p>
        </div>
        <div className="rounded-pj border border-linea bg-superficie p-4 shadow-card sm:p-6">
          <h2 className="mb-4 font-serif text-[16px] font-semibold">
            Iniciar sesión
          </h2>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-[11px] text-on-marca">
          Acceso restringido a usuarios autorizados.
        </p>
        <div className="mt-4 flex justify-center">
          <ThemeSwitch tema="clasico" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 text-center">
        <span className="text-[10px] uppercase leading-tight tracking-[.14em] text-on-marca-2">
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

/** Login Agentes PEI: crema con blobs, logo animado, card redondeada, CTA naranja. */
function LoginAgentes() {
  return (
    <TemaProvider tema="agentes">
      <MotionProvider>
        <div className="safe-b relative flex min-h-[100svh] flex-col items-center justify-center gap-6 overflow-hidden bg-fondo px-4 py-8">
          <BlobsFondo />
          <div className="relative w-full max-w-[420px]">
            <div className="mb-6 text-center">
              <LogoAgentes
                animado
                className="mx-auto mb-4 h-[88px] w-[88px] xs:h-24 xs:w-24"
              />
              <h1 className="font-serif text-[26px] font-bold leading-tight text-tinta xs:text-[30px]">
                Agentes{" "}
                <span className="bg-marca bg-clip-text text-transparent">PEI</span>
              </h1>
              <p className="mt-2 text-[13px] text-muted">
                Seguimiento del Plan Estratégico Institucional 2026–2030
                <br />
                <span className="font-medium text-tinta">Poder Judicial del Paraguay</span>
              </p>
            </div>
            <div className="rounded-pj border border-linea bg-superficie p-5 shadow-card sm:p-7">
              <h2 className="mb-1 font-serif text-[18px] font-bold text-tinta">
                ¡Hola de nuevo!
              </h2>
              <p className="mb-5 text-[12.5px] text-muted">
                Ingresá con tu cuenta institucional.
              </p>
              <LoginForm />
            </div>
            <p className="mt-4 text-center text-[11px] text-muted">
              Acceso restringido a usuarios autorizados.
            </p>
            <div className="mt-4 flex justify-center">
              <ThemeSwitch tema="agentes" sobreOscuro={false} />
            </div>
          </div>

          <div className="relative flex items-center gap-4 rounded-chip bg-navy px-5 py-3 shadow-card">
            <Image
              src="/brand/logo-csj.png"
              alt="Corte Suprema de Justicia"
              width={140}
              height={140}
              className="h-9 w-9"
            />
            <span className="h-7 w-px bg-white/20" aria-hidden="true" />
            <span className="text-[9.5px] uppercase leading-tight tracking-[.12em] text-on-marca">
              Con el
              <br />
              apoyo de
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
      </MotionProvider>
    </TemaProvider>
  );
}
