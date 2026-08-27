import type { Metadata } from "next";
import { requirePage, tieneRol } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { prismaControl } from "@/server/db/client";
import { AnioQuery } from "@/shared/schemas/query";
import { catalogoIndicadores } from "@/server/services/estado-pei.service";
import { resolutorVentanas } from "@/server/services/plazos.service";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { PageHeader } from "@/ui/components/page-header";
import { BackButton } from "@/ui/components/back-button";
import { AnioSelector } from "@/ui/components/anio-selector";
import {
  PlazosView,
  type ActoPlazo,
  type FilaPlazo,
} from "@/ui/features/admin/plazos-view";

export const metadata: Metadata = { title: "Plazos de carga" };
export const dynamic = "force-dynamic";

export default async function AdminPlazosPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage("ADMIN", "DGPD_VALIDADOR");
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);

  const [indicadores, ventanaDe, periodo] = await Promise.all([
    catalogoIndicadores(ctx),
    resolutorVentanas(ctx, anio),
    periodoAnual(ctx, anio),
  ]);

  const filas: FilaPlazo[] = indicadores
    .map((ind) => {
      const v = ventanaDe(ind);
      const principal =
        ind.responsables.find((r) => r.rol === "PRINCIPAL") ?? ind.responsables[0];
      return {
        codigo: ind.codigo,
        nombre: ind.nombre,
        oeCodigo: ind.oe.codigo,
        aeCodigo: ind.ae?.codigo ?? null,
        dependencia: principal?.dependencia.nombre ?? "—",
        dependenciaId: principal?.dependenciaId ?? null,
        estado: v.estado,
        fechaLimite: v.fechaLimite ? v.fechaLimite.toISOString() : null,
        diasRestantes: v.diasRestantes,
        conProrroga: v.conProrroga,
        cierreManual: v.cierreManual,
        origen: v.origen,
      };
    })
    .sort((a, b) => a.codigo - b.codigo);

  const registros = await ctx.db.ventanaCarga.findMany({
    where: { periodoId: periodo.id },
    orderBy: { creadoEn: "desc" },
    take: 60,
  });
  const autores = await prismaControl().usuario.findMany({
    where: {
      id: { in: [...new Set(registros.map((r) => r.usuarioId).filter((x): x is number => x !== null))] },
    },
    select: { id: true, nombre: true },
  });
  const nombreDe = new Map(autores.map((u) => [u.id, u.nombre]));
  const actos: ActoPlazo[] = registros.map((r) => ({
    id: r.id,
    scope: r.scope,
    entidad: r.entidad,
    tipo: r.tipo,
    fechaLimite: r.fechaLimite ? r.fechaLimite.toISOString() : null,
    motivo: r.motivo,
    autor: r.usuarioId !== null ? (nombreDe.get(r.usuarioId) ?? null) : null,
    creadoEn: r.creadoEn.toISOString(),
  }));

  return (
    <section>
      <div className="mb-4">
        <BackButton />
      </div>
      <PageHeader
        title="Plazos de carga"
        subtitle="Fecha límite del ejercicio, habilitación y cierre de la carga, y prórrogas por indicador o dependencia"
        right={<AnioSelector anio={anio} />}
      />
      <PlazosView
        anio={anio}
        plazoGlobal={
          periodo.fechaLimiteCarga ? periodo.fechaLimiteCarga.toISOString() : null
        }
        filas={filas}
        actos={actos}
        esAdmin={tieneRol(actor, "ADMIN")}
      />
    </section>
  );
}
