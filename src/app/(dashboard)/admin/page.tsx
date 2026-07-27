import Link from "next/link";
import type { Metadata } from "next";
import { requirePage, tieneRol } from "@/server/auth/guards";
import { getCtx, getDbEnv } from "@/server/db/env";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader } from "@/ui/components/card";
import { DbSwitch } from "@/ui/features/admin/db-switch";

export const metadata: Metadata = { title: "Administración" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const actor = await requirePage("ADMIN", "DGPD_VALIDADOR");
  const ctx = await getCtx(actor);
  const dbEnv = await getDbEnv();
  const esAdmin = tieneRol(actor, "ADMIN");

  const [nInd, nMed, nUmbrales, nUsuarios] = await Promise.all([
    ctx.db.indicador.count(),
    ctx.db.medicion.count(),
    ctx.db.umbralCriticidad.count(),
    ctx.db.usuario.count(),
  ]);

  const secciones = [
    {
      href: "/admin/matriz",
      titulo: "Matriz PEI",
      desc: `Editar atributos, línea base y metas de los ${nInd} indicadores.`,
    },
    {
      href: "/admin/escalas",
      titulo: "Escalas de criticidad",
      desc: `Umbrales del semáforo con herencia Global → OE → AE → Indicador (${nUmbrales} configuradas).`,
    },
    ...(esAdmin
      ? [
          {
            href: "/admin/usuarios",
            titulo: "Usuarios y accesos",
            desc: `RBAC y asignación de dependencias (${nUsuarios} usuarios).`,
          },
        ]
      : []),
  ];

  return (
    <section>
      <PageHeader
        title="Administración"
        subtitle={`Configuración de la plataforma · ${nMed} mediciones en el entorno activo`}
      />

      {esAdmin ? (
        <Card className="mb-4">
          <CardHeader
            title="Entorno de datos de su sesión"
            meta="el switch solo afecta a administradores"
          />
          <CardBody>
            <DbSwitch actual={dbEnv} />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        {secciones.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full p-4 transition-colors hover:border-azul-line hover:bg-azul-soft">
              <div className="font-serif text-[16px] font-semibold text-azul-d">
                {s.titulo}
              </div>
              <p className="mt-2 text-[12.5px] text-muted">{s.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
