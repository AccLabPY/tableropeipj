import { AppBar } from "@/ui/layout/app-bar";
import { Sidebar } from "@/ui/layout/sidebar";
import { MobileNav } from "@/ui/layout/mobile-nav";
import { TestModeBanner } from "@/ui/layout/test-mode-banner";
import { UserMenu } from "@/ui/layout/user-menu";
import { Footer } from "@/ui/layout/footer";
import { requirePage } from "@/server/auth/guards";
import { getDbEnv } from "@/server/db/env";
import { rutasPermitidas } from "@/shared/constants";

/**
 * Shell del dashboard: exige sesión, filtra la navegación por rol y muestra
 * el banner MODO PRUEBA cuando el entorno de datos activo es peipj_test.
 * Responsive: sidebar fija en ≥lg, drawer hamburguesa en móvil.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const actor = await requirePage();
  const dbEnv = await getDbEnv();
  const rutas = rutasPermitidas(actor.roles);

  return (
    <div className="flex min-h-[100svh] flex-col">
      <AppBar left={<MobileNav allowedHrefs={rutas} />}>
        <UserMenu nombre={actor.nombre} roles={actor.roles} />
      </AppBar>
      {dbEnv === "test" ? <TestModeBanner /> : null}
      <div className="mx-auto grid w-full max-w-pj flex-1 grid-cols-1 lg:grid-cols-[224px_1fr]">
        <div className="hidden lg:block">
          <Sidebar allowedHrefs={rutas} />
        </div>
        <main className="safe-b min-w-0 px-3 pb-16 pt-4 xs:px-4 sm:px-[26px] sm:pb-20 sm:pt-[22px]">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
