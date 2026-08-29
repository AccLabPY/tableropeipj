import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { worklistRegistro } from "@/server/services/registro.service";
import { AnioQuery, CodigoParam } from "@/shared/schemas/query";
import { ChipWorkflow } from "@/ui/features/shared/chip-workflow";
import { RegistroFormulario } from "@/ui/features/registro/registro-formulario";
import { fmtFechaCorta } from "@/lib/utils";

export const metadata: Metadata = { title: "Reportar avance" };
export const dynamic = "force-dynamic";

/**
 * Carga de avances de UN indicador. Pantalla dedicada: sin lista ni buscador
 * de otros indicadores (pedido del Poder Judicial, 2026); se llega desde la
 * tabla de /registro, desde la ficha del indicador o desde una notificación.
 * El encabezado replica el de la ficha del indicador para que el salto entre
 * ambas pantallas no se sienta brusco.
 */
export default async function RegistroIndicadorPage({
  params,
  searchParams,
}: {
  params: { codigo: string };
  searchParams: { anio?: string };
}) {
  const actor = await requirePage("DEPENDENCIA_CARGA", "DGPD_VALIDADOR", "ADMIN");
  const ctx = await getCtx(actor);
  const parse = CodigoParam.safeParse(params.codigo);
  if (!parse.success) notFound();
  const anio = AnioQuery.parse(searchParams.anio);

  const data = await worklistRegistro(ctx, anio);
  const item = data.items.find((i) => i.codigo === parse.data);
  // Un indicador ajeno a la dependencia no existe para este usuario.
  if (!item) notFound();

  const v = item.ventana;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/registro?anio=${anio}`}
          className="tap inline-flex h-[34px] flex-none items-center gap-[7px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-[13px] text-[12px] font-semibold hover:border-azul-line hover:bg-hover agentes:rounded-chip"
        >
          <ArrowLeft className="h-4 w-4" />
          Indicadores
        </Link>
        <Link
          href={`/indicadores/${item.codigo}?anio=${anio}`}
          className="tap inline-flex h-[34px] flex-none items-center gap-[6px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-3 text-[12px] font-semibold text-tinta hover:border-azul-line hover:bg-hover agentes:rounded-chip"
        >
          Ficha
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Encabezado con el mismo lenguaje visual que la ficha del indicador */}
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[420px]">
          {/* Jerarquía OE › AE */}
          <div className="flex flex-wrap items-center gap-[7px]">
            <span className="rounded-pj-sm bg-navy px-2 py-[3px] text-2xs font-semibold uppercase tracking-[.06em] text-white">
              {item.oeCodigo}
            </span>
            {item.aeCodigo ? (
              <>
                <span className="text-[12px] leading-none text-muted-2">›</span>
                <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                  {item.aeCodigo}
                </span>
              </>
            ) : (
              <span className="rounded-pj-sm border border-azul-line bg-azul-soft px-2 py-[3px] text-2xs font-semibold tracking-[.03em] text-azul-d">
                Indicador de objetivo
              </span>
            )}
            <span className="rounded-pj-sm border border-linea bg-sem-gris-bg px-2 py-[3px] text-2xs text-muted">
              Ejercicio {anio}
            </span>
          </div>

          <h1 className="mt-[10px] font-serif text-titulo leading-tight">
            <span className="text-azul-d">{item.codigo}</span> · {item.nombre}
          </h1>

          {/* Contexto estructurado */}
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-[10px] border-l-2 border-azul-line pl-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                Dependencia responsable
              </div>
              <div className="mt-[3px] max-w-2xl text-[12.5px] leading-relaxed text-tinta">
                {item.dependenciaPrincipal}
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
                Plazo de carga
              </div>
              <div className="mt-[3px] text-[12.5px] leading-relaxed text-tinta">
                {v.estado === "CERRADA" ? (
                  <span className="font-semibold text-sem-rojo-fg">
                    {v.cierreManual ? "Cerrada por la DGPD" : "Plazo vencido"}
                  </span>
                ) : v.fechaLimite ? (
                  <>
                    {fmtFechaCorta(v.fechaLimite)}
                    {v.diasRestantes !== null && v.diasRestantes <= 7 ? (
                      <span className="ml-1 font-semibold text-sem-ambar-fg">
                        ·{" "}
                        {v.diasRestantes <= 0
                          ? "vence hoy"
                          : `faltan ${v.diasRestantes} días`}
                      </span>
                    ) : null}
                    {v.conProrroga ? (
                      <span className="ml-1 text-muted">(prorrogado)</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-muted">Sin plazo definido</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Estado de la carga, alineado como el cumplimiento de la ficha */}
        <div className="flex flex-none flex-col items-start gap-[6px] sm:items-end">
          <div className="text-[10px] uppercase tracking-[.07em] text-muted-2">
            Estado de la carga {anio}
          </div>
          <ChipWorkflow estado={item.medicion?.estado ?? "PENDIENTE"} />
          {item.medicion ? (
            <div className="text-[11px] text-muted-2">
              versión {item.medicion.version}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mb-5 h-px bg-linea" />

      <RegistroFormulario data={data} item={item} />
    </section>
  );
}
