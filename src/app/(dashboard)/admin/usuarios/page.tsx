import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { prismaControl } from "@/server/db/client";
import type { RolUsuario } from "@/domain/types";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import {
  UsuariosView,
  type UsuarioAdminDTO,
} from "@/ui/features/admin/usuarios-view";

export const metadata: Metadata = { title: "Usuarios y accesos" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  await requirePage("ADMIN");
  // Los usuarios viven en el plano de control (base de producción) siempre.
  const db = prismaControl();
  const [usuarios, dependencias] = await Promise.all([
    db.usuario.findMany({
      include: { roles: true, dependencias: true },
      orderBy: { id: "asc" },
    }),
    db.dependencia.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const dto: UsuarioAdminDTO[] = usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    activo: u.activo,
    roles: u.roles.map((r) => r.rol as RolUsuario),
    dependenciaIds: u.dependencias.map((d) => d.dependenciaId),
  }));

  return (
    <section>
      <BackButton />
      <div className="mt-3">
        <PageHeader
          title="Usuarios y accesos"
          subtitle="RBAC y asignación de dependencias · los usuarios son globales (no dependen del modo de datos)"
        />
      </div>
      <UsuariosView
        usuarios={dto}
        dependencias={dependencias.map((d) => ({ id: d.id, nombre: d.nombre }))}
      />
    </section>
  );
}
