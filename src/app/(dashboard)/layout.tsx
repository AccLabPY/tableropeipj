import { AppBar } from "@/ui/layout/app-bar";
import { Sidebar, SidebarAgentes } from "@/ui/layout/sidebar";
import { MobileNav } from "@/ui/layout/mobile-nav";
import { TestModeBanner } from "@/ui/layout/test-mode-banner";
import { UserMenu } from "@/ui/layout/user-menu";
import { Footer } from "@/ui/layout/footer";
import { ThemeSwitch } from "@/ui/layout/theme-switch";
import { AppBarAgentes } from "@/ui/layout/agentes/app-bar-agentes";
import { FooterAgentes } from "@/ui/layout/agentes/footer-agentes";
import { TemaProvider } from "@/ui/tema/tema-provider";
import { MotionProvider } from "@/ui/motion/motion-provider";
import { requirePage } from "@/server/auth/guards";
import { getDbEnv } from "@/server/db/env";
import { getTema } from "@/server/tema/tema";
import { rutasPermitidas } from "@/shared/constants";

/**
 * Shell del dashboard: exige sesión, filtra la navegación por rol y muestra
 * el banner MODO PRUEBA cuando el entorno de datos activo es peipj_test.
 * Elige el shell según el tema del usuario (Agentes PEI o Clásico).
 * Responsive: sidebar fija en ≥lg, drawer hamburguesa en móvil.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const actor = await requirePage();
  const [dbEnv, tema] = await Promise.all([getDbEnv(), getTema()]);
  const rutas = rutasPermitidas(actor.roles);
  const agentes = tema === "agentes";

  const barra = (
    <>
      <ThemeSwitch tema={tema} />
      <UserMenu nombre={actor.nombre} roles={actor.roles} />
    </>
  );

  return (
    <TemaProvider tema={tema}>
      <MotionProvider>
        <div className="flex min-h-[100svh] flex-col">
          {agentes ? (
            <AppBarAgentes left={<MobileNav allowedHrefs={rutas} variante="agentes" />}>
              {barra}
            </AppBarAgentes>
          ) : (
            <AppBar left={<MobileNav allowedHrefs={rutas} />}>{barra}</AppBar>
          )}
          {dbEnv === "test" ? <TestModeBanner /> : null}
          <div className="mx-auto grid w-full max-w-pj flex-1 grid-cols-1 lg:grid-cols-[224px_1fr]">
            <div className="hidden lg:block">
              {agentes ? (
                <SidebarAgentes allowedHrefs={rutas} />
              ) : (
                <Sidebar allowedHrefs={rutas} />
              )}
            </div>
            {/* Altura mínima estable: el contenido corto no "encoge" la página
                (el footer nunca sube del pliegue); solo crece hacia abajo. */}
            <main className="safe-b min-h-[calc(100svh-64px)] min-w-0 px-3 pb-16 pt-4 xs:px-4 sm:px-[26px] sm:pb-20 sm:pt-[22px]">
              {children}
            </main>
          </div>
          {agentes ? <FooterAgentes /> : <Footer />}
        </div>
      </MotionProvider>
    </TemaProvider>
  );
}
