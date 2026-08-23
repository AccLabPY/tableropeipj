import type { Metadata } from "next";
import { FileSpreadsheet, FileText } from "lucide-react";
import { requirePage } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { estadoPEI } from "@/server/services/estado-cache";
import { AnioQuery } from "@/shared/schemas/query";
import { PageHeader } from "@/ui/components/page-header";
import { Card } from "@/ui/components/card";
import { AnioSelector } from "@/ui/components/anio-selector";
import { SelectorReporte } from "@/ui/features/reportes/selector-reporte";

export const metadata: Metadata = { title: "Reportes" };
export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: { anio?: string };
}) {
  const actor = await requirePage();
  const ctx = await getCtx(actor);
  const anio = AnioQuery.parse(searchParams.anio);
  const estado = await estadoPEI(ctx, anio);

  const oes = estado.objetivos.map((o) => ({
    valor: o.numero,
    etiqueta: `${o.codigo} — ${o.nombre}`,
  }));
  const aes = estado.objetivos.flatMap((o) =>
    o.acciones.map((a) => ({
      valor: a.codigo,
      etiqueta: `${a.codigo} — ${a.nombre}`,
      grupo: `${o.codigo} · ${o.nombre}`,
    })),
  );
  const depsUnicas = new Map<number, string>();
  for (const i of estado.indicadores) {
    if (i.dependenciaPrincipalId !== null) {
      depsUnicas.set(i.dependenciaPrincipalId, i.dependenciaPrincipal);
    }
  }
  const deps = [...depsUnicas.entries()]
    .map(([valor, etiqueta]) => ({ valor, etiqueta }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
  const indicadores = estado.indicadores.map((i) => ({
    valor: i.codigo,
    etiqueta: `${i.codigo} — ${i.nombre}`,
    grupo: i.aeCodigo ? `${i.oeCodigo} · ${i.aeCodigo}` : `${i.oeCodigo} · Nivel OE`,
  }));

  return (
    <section>
      <PageHeader
        title="Reportes"
        subtitle={`Exportables en PDF (imprimir → guardar) y Excel · ejercicio ${anio}`}
        right={<AnioSelector anio={anio} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TarjetaReporte
          tipo="pdf"
          titulo="Reporte ejecutivo del ejercicio"
          desc="Índice global, avance por objetivo, distribución del semáforo e indicadores en atención."
        >
          <BotonAbrir href={`/reportes/ejecutivo?anio=${anio}`} />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Reporte por objetivo estratégico"
          desc="El OE con sus acciones estratégicas y la tabla completa de indicadores. PDF o planilla Excel."
        >
          <SelectorReporte
            opciones={oes}
            base="/reportes/oe"
            baseExcel="/api/v1/reportes/oe"
            anio={anio}
            placeholder="— Seleccionar objetivo —"
          />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Reporte por acción estratégica"
          desc="Una A.E. con sus indicadores, responsables y estado de reporte. PDF o planilla Excel."
        >
          <SelectorReporte
            opciones={aes}
            base="/reportes/ae"
            baseExcel="/api/v1/reportes/ae"
            anio={anio}
            placeholder="— Seleccionar acción —"
          />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Reporte por dependencia"
          desc="Los indicadores a cargo de una dependencia con su estado de reporte — para las mesas de seguimiento. PDF o Excel."
        >
          <SelectorReporte
            opciones={deps}
            base="/reportes/dependencia"
            baseExcel="/api/v1/reportes/dependencia"
            anio={anio}
            placeholder="— Seleccionar dependencia —"
          />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Ficha de indicador"
          desc="La ficha técnica completa con trayectoria, mediciones y evidencias — para expedientes. PDF o Excel."
        >
          <SelectorReporte
            opciones={indicadores}
            base="/reportes/indicador"
            baseExcel="/api/v1/reportes/indicador"
            anio={anio}
            placeholder="— Seleccionar indicador —"
          />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Gobernanza del reporte"
          desc="Cobertura por dependencia, pipeline de validación y calidad del dato del período."
        >
          <BotonAbrir href={`/reportes/gobernanza?anio=${anio}`} />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="pdf"
          titulo="Riesgos estratégicos"
          desc="Matriz probabilidad × impacto de los riesgos del PEI con su mitigación, por objetivo."
        >
          <BotonAbrir href="/reportes/riesgos" />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="xlsx"
          titulo="Catálogo con avances (Excel)"
          desc="Los 89 indicadores con metas, valores vigentes, cumplimiento, semáforo y responsables."
        >
          <BotonAbrir
            href={`/api/v1/reportes/catalogo?anio=${anio}`}
            etiqueta="Descargar .xlsx"
            descarga
          />
        </TarjetaReporte>

        <TarjetaReporte
          tipo="xlsx"
          titulo="Mediciones del período (Excel)"
          desc="Todas las mediciones del ejercicio con variables, estados, fuentes y validaciones — insumo para análisis."
        >
          <BotonAbrir
            href={`/api/v1/reportes/mediciones?anio=${anio}`}
            etiqueta="Descargar .xlsx"
            descarga
          />
        </TarjetaReporte>
      </div>

      <p className="mt-5 text-[11.5px] text-muted">
        Los reportes PDF se abren como vista de impresión: use «Imprimir /
        Guardar PDF» (o Ctrl+P) para generar el archivo. Las cifras provienen
        exclusivamente de mediciones aprobadas por la DGPD.
      </p>
    </section>
  );
}

function TarjetaReporte({
  tipo,
  titulo,
  desc,
  children,
}: {
  tipo: "pdf" | "xlsx";
  titulo: string;
  desc: string;
  children: React.ReactNode;
}) {
  const Icono = tipo === "pdf" ? FileText : FileSpreadsheet;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 flex-none place-items-center rounded-pj ${
            tipo === "pdf"
              ? "bg-azul-soft text-azul-d"
              : "bg-sem-verde-bg text-sem-verde-fg"
          }`}
        >
          <Icono className="h-5 w-5" />
        </span>
        <h2 className="min-w-0 font-serif text-[15px] font-semibold text-tinta">
          {titulo}
        </h2>
      </div>
      <p className="mt-2 flex-1 text-[12px] leading-relaxed text-muted">
        {desc}
      </p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function BotonAbrir({
  href,
  etiqueta = "Abrir reporte",
  descarga = false,
}: {
  href: string;
  etiqueta?: string;
  descarga?: boolean;
}) {
  return (
    <a
      href={href}
      {...(descarga ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="inline-flex items-center gap-[6px] rounded-pj border border-azul-d bg-azul px-3 py-[7px] text-[12px] font-semibold text-white hover:bg-azul-d"
    >
      {etiqueta}
    </a>
  );
}
