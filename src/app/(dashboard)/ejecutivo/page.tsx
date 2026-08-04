import Link from "next/link";
import type { Metadata } from "next";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { ultimasCargas } from "@/server/services/ultimas-cargas.service";
import { UltimasCargas } from "@/ui/features/ejecutivo/ultimas-cargas";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card, CardBody, CardHeader, Tag } from "@/ui/components/card";
import { SemPill } from "@/ui/components/sem-pill";
import { ProgressBar } from "@/ui/components/progress";
import { AnioSelector } from "@/ui/components/anio-selector";
import { LazyDonutSemaforo } from "@/ui/charts/lazy";
import { SEM_COLORS } from "@/ui/theme/tokens";
import { fmtPct, fmtValor } from "@/lib/utils";

export const metadata: Metadata = { title: "Tablero ejecutivo" };
export const dynamic = "force-dynamic";

export default async function EjecutivoPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const [estado, cargas] = await Promise.all([
    estadoPEI(ctx, anio),
    ultimasCargas(ctx),
  ]);

  const atencion = estado.indicadores
    .filter((i) => i.capado !== null)
    .sort((a, b) => a.capado! - b.capado!)
    .slice(0, 8);

  return (
    <section>
      <PageHeader
        title="Tablero ejecutivo"
        subtitle={`Cumplimiento de metas · ejercicio ${anio} · 6 objetivos · ${estado.indicadores.length} indicadores`}
        right={<AnioSelector anio={anio} />}
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-[.08em] text-muted">
            Índice de cumplimiento {anio}
          </div>
          <div className="tnum mt-2 font-serif text-[30px] leading-none">
            {fmtPct(estado.indicePEI)}
          </div>
          <div className="mt-2 text-[11px] text-muted">
            Promedio ponderado de los 6 OE
          </div>
          <div className="mt-2">
            <ProgressBar frac={estado.indicePEI} sem="VERDE" alto="h-[5px]" />
          </div>
        </Card>
        {(
          [
            ["VERDE", "En meta", "indicadores en meta"],
            ["AMARILLO", "En riesgo", "entre umbrales"],
            ["ROJO", "Críticos", "bajo el umbral"],
          ] as const
        ).map(([sem, label, foot]) => (
          <Card key={sem} className="p-4">
            <div className="flex items-center gap-[6px] text-2xs uppercase tracking-[.08em] text-muted">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: SEM_COLORS[sem] }}
              />
              {label}
            </div>
            <div className="tnum mt-2 font-serif text-[30px] leading-none">
              {estado.distribucion[sem]}
            </div>
            <div className="mt-2 text-[11px] text-muted">{foot}</div>
          </Card>
        ))}
        <Card className="p-4">
          <div className="text-2xs uppercase tracking-[.08em] text-muted">
            Cobertura de reporte
          </div>
          <div className="tnum mt-2 font-serif text-[30px] leading-none">
            {fmtPct(estado.cobertura.fraccion)}
          </div>
          <div className="mt-2 text-[11px] text-muted">
            {estado.cobertura.aprobadas} de {estado.cobertura.esperadas}{" "}
            mediciones aprobadas
          </div>
          <div className="mt-2 h-[5px] overflow-hidden rounded bg-linea">
            <div
              className="h-full bg-navy"
              style={{
                width: `${Math.round(estado.cobertura.fraccion * 100)}%`,
              }}
            />
          </div>
        </Card>
      </div>

      {/* OE + donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Avance por objetivo estratégico"
            meta={`meta ${anio} vs. aprobado`}
          />
          <CardBody>
            {estado.objetivos.map((oe) => (
              <div
                key={oe.codigo}
                className="grid grid-cols-[44px_1fr_52px] items-center gap-3 border-b border-linea-2 py-[10px] last:border-b-0"
              >
                <div className="font-serif text-[14px] font-semibold text-azul-d">
                  {oe.codigo}
                </div>
                <div>
                  <div className="text-[12.5px]">{oe.nombre}</div>
                  <div className="mt-[6px]">
                    <ProgressBar frac={oe.avance} sem={oe.semaforo} />
                  </div>
                </div>
                <div
                  className="tnum text-right text-[14px] font-semibold"
                  style={{ color: SEM_COLORS[oe.semaforo] }}
                >
                  {fmtPct(oe.avance)}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Distribución de cumplimiento"
            meta={`${estado.indicadores.length} indicadores`}
          />
          <CardBody>
            <LazyDonutSemaforo distribucion={estado.distribucion} />
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-[11px] text-muted">
              {(["VERDE", "AMARILLO", "ROJO", "GRIS"] as const).map((s) => (
                <span key={s} className="inline-flex items-center gap-[6px]">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: SEM_COLORS[s] }}
                  />
                  {
                    {
                      VERDE: "En meta",
                      AMARILLO: "En riesgo",
                      ROJO: "Crítico",
                      GRIS: "Pendiente",
                    }[s]
                  }{" "}
                  ({estado.distribucion[s]})
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Atención */}
      <Card className="mt-4">
        <CardHeader
          title="Indicadores que requieren atención"
          meta="ordenados por cumplimiento ascendente"
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                <th className="border-b border-linea px-3 py-[9px]">Código</th>
                <th className="border-b border-linea px-3 py-[9px]">
                  Indicador
                </th>
                <th className="hidden border-b border-linea px-3 py-[9px] sm:table-cell">OE</th>
                <th className="hidden border-b border-linea px-3 py-[9px] lg:table-cell">
                  Dependencia responsable
                </th>
                <th className="hidden border-b border-linea px-3 py-[9px] text-right md:table-cell">
                  Meta {anio}
                </th>
                <th className="hidden border-b border-linea px-3 py-[9px] text-right md:table-cell">
                  Aprobado
                </th>
                <th className="border-b border-linea px-3 py-[9px] text-right">
                  Cumplim.
                </th>
                <th className="border-b border-linea px-3 py-[9px]">
                  Semáforo
                </th>
              </tr>
            </thead>
            <tbody>
              {atencion.map((i) => (
                <tr key={i.codigo} className="hover:bg-[#F8FAFB]">
                  <td className="border-b border-linea-2 px-3 py-[10px]">
                    <Link
                      href={`/indicadores/${i.codigo}?anio=${anio}`}
                      className="font-serif font-semibold text-azul-d hover:underline"
                    >
                      {i.codigo}
                    </Link>
                  </td>
                  <td className="border-b border-linea-2 px-3 py-[10px] text-[12.5px]">
                    {i.nombre}
                  </td>
                  <td className="hidden border-b border-linea-2 px-3 py-[10px] sm:table-cell">
                    <Tag>{i.oeCodigo}</Tag>
                  </td>
                  <td className="hidden border-b border-linea-2 px-3 py-[10px] text-[12.5px] text-muted lg:table-cell">
                    {i.dependenciaPrincipal}
                  </td>
                  <td className="tnum hidden border-b border-linea-2 px-3 py-[10px] text-right md:table-cell">
                    {fmtValor(i.meta, i.unidad)}
                  </td>
                  <td className="tnum hidden border-b border-linea-2 px-3 py-[10px] text-right md:table-cell">
                    {fmtValor(i.valor, i.unidad)}
                  </td>
                  <td className="tnum border-b border-linea-2 px-3 py-[10px] text-right font-semibold">
                    {fmtPct(i.capado)}
                  </td>
                  <td className="border-b border-linea-2 px-3 py-[10px]">
                    <SemPill sem={i.semaforo} />
                  </td>
                </tr>
              ))}
              {atencion.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted">
                    Sin mediciones aprobadas en el período: no hay cumplimientos
                    computados todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Últimas cargas reales */}
      <UltimasCargas cargas={cargas} />
    </section>
  );
}
