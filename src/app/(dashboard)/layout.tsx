import { AppBar } from "@/ui/layout/app-bar";
import { Sidebar } from "@/ui/layout/sidebar";
import { TestModeBanner } from "@/ui/layout/test-mode-banner";
import { UserMenu } from "@/ui/layout/user-menu";
import { requirePage } from "@/server/auth/guards";
import { getDbEnv } from "@/server/db/env";
import { rutasPermitidas } from "@/shared/constants";

/**
 * Shell del dashboard: exige sesión, filtra la navegación por rol y muestra
 * el banner MODO PRUEBA cuando el entorno de datos activo es peipj_test.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const actor = await requirePage();
  const dbEnv = await getDbEnv();

  return (
    <div className="min-h-screen">
      <AppBar>
        <UserMenu nombre={actor.nombre} roles={actor.roles} />
      </AppBar>
      {dbEnv === "test" ? <TestModeBanner /> : null}
      <div className="mx-auto grid min-h-[calc(100vh-66px)] max-w-[1440px] grid-cols-[224px_1fr]">
        <Sidebar allowedHrefs={rutasPermitidas(actor.roles)} />
        <main className="min-w-0 px-[26px] pb-10 pt-[22px]">{children}</main>
      </div>
    </div>
  );
}
