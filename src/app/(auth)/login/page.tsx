import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import { ThemeSwitch } from "@/ui/layout/theme-switch";
import { LogoAgentes } from "@/ui/brand/logo-agentes";
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
          <h1 className="font-serif text-titulo">
            Poder Judicial del Paraguay
          </h1>
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

/**
 * Login Agentes PEI: pieza única de dos columnas — fotografía institucional
 * del Palacio de Justicia (con degradé azul) + panel blanco de acceso.
 */
function LoginAgentes() {
  return (
    <TemaProvider tema="agentes">
      <MotionProvider>
        <main className="safe-b grid min-h-[100svh] w-full bg-superficie md:grid-cols-[52%_48%] lg:grid-cols-[54%_46%]">
          {/* Fotografía: ocupa toda la altura de la ventana en escritorio */}
          <aside className="relative min-h-[225px] overflow-hidden xs:min-h-[260px] md:sticky md:top-0 md:h-[100svh] md:min-h-0">
            <Image
              src="/brand/palacio-justicia.jpg"
              alt="Palacio de Justicia, Asunción"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 54vw"
              className="object-cover object-[center_43%]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,27,48,.02)_0%,rgba(6,27,48,.05)_25%,rgba(6,27,48,.19)_43%,rgba(6,27,48,.62)_66%,rgba(6,27,48,.94)_100%)]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,21,40,.14)_0%,rgba(2,21,40,.02)_55%,transparent_100%)]"
            />
            <div className="absolute inset-x-6 bottom-6 z-[1] text-white md:inset-x-12 md:bottom-14 lg:left-[64px] lg:right-12 lg:bottom-[88px]">
              <span className="mb-2 block text-[10px] font-bold tracking-[.045em] md:mb-[15px] md:text-[13px]">
                PLAN ESTRATÉGICO INSTITUCIONAL
              </span>
              <h2 className="mb-2 flex items-baseline gap-2 leading-none md:mb-[18px] md:gap-[18px]">
                <strong className="text-[32px] font-extrabold tracking-[-.04em] md:text-[48px] lg:text-[66px]">
                  PEI
                </strong>
                <span className="text-[27px] font-light tracking-[-.035em] md:text-[43px] lg:text-[61px]">
                  2026—2030
                </span>
              </h2>
              <p className="hidden max-w-[550px] text-[15px] leading-[1.55] text-white/90 md:block lg:text-[17px]">
                Seguimiento estratégico para una gestión institucional basada en
                evidencia.
              </p>
              <div
                aria-hidden="true"
                className="my-3 h-[3px] w-[38px] rounded-chip bg-accion md:my-[26px] md:h-1 md:w-[58px]"
              />
              <p className="text-[12px] font-semibold md:text-[15px]">
                Poder Judicial del Paraguay
              </p>
            </div>
          </aside>

          {/* Panel de acceso: centrado; si no entra, la página hace scroll */}
          <section className="flex items-center justify-center px-[23px] py-9 sm:px-8 md:p-10 lg:p-12">
            <div className="flex w-full max-w-[455px] flex-col">
              <header className="mb-7 flex flex-col items-center text-center">
                <LogoAgentes className="mb-2 h-[72px] w-[72px] md:h-[84px] md:w-[84px]" />
                <div className="font-serif text-[26px] font-bold leading-tight tracking-tight text-tinta md:text-[28px]">
                  Agentes <span className="text-azul">PEI</span>
                </div>
                <p className="mt-[6px] text-[12.5px] leading-[1.4] text-muted">
                  Seguimiento del Plan Estratégico Institucional 2026–2030
                </p>
              </header>

              <div className="mb-7">
                <h1 className="mb-[7px] font-serif text-[24px] font-bold leading-[1.15] tracking-[-.025em] text-tinta md:text-[26px]">
                  ¡Hola de nuevo!
                </h1>
                <p className="text-[13.5px] leading-[1.55] text-muted">
                  Ingresá con tu cuenta institucional para continuar.
                </p>
              </div>

              <LoginForm variante="agentes" />

              <p className="mt-[26px] text-center text-[11.5px] text-muted-2">
                Acceso restringido a usuarios autorizados.
              </p>

              <footer className="mt-8 border-t border-linea-2 pt-5">
                <div className="flex min-h-[64px] items-center justify-center gap-[18px]">
                  <Image
                    src="/brand/logo-csj-navy.png"
                    alt="Corte Suprema de Justicia"
                    width={140}
                    height={140}
                    className="h-12 w-12 opacity-90"
                  />
                  <span aria-hidden="true" className="h-9 w-px bg-linea" />
                  <span className="whitespace-nowrap text-[10.5px] font-semibold text-azul-d">
                    CON EL APOYO DE
                  </span>
                  <Image
                    src="/brand/logo-pnud-azul.svg"
                    alt="Programa de las Naciones Unidas para el Desarrollo"
                    width={61}
                    height={122}
                    className="h-[52px] w-auto"
                  />
                </div>
                <div className="mt-4 flex justify-center">
                  <ThemeSwitch tema="agentes" sutil />
                </div>
              </footer>
            </div>
          </section>
        </main>
      </MotionProvider>
    </TemaProvider>
  );
}
