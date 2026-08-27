"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardEdit, Lock } from "lucide-react";
import type { RegistroDTO, RegistroItemDTO } from "@/shared/dtos/registro";
import { Card, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { BuscadorLista, coincide } from "@/ui/components/buscador-lista";
import { WF_CHIP } from "@/ui/features/shared/chip-workflow";
import { AvisoVencimientos } from "./aviso-vencimientos";
import { cn, fmtFechaCorta } from "@/lib/utils";

// En Registro, "APROBADO" se muestra como "Validado" (lenguaje de la DGPD).
const CHIP: typeof WF_CHIP = {
  ...WF_CHIP,
  APROBADO: { ...WF_CHIP.APROBADO, label: "Validado" },
};

type Filtro = "TODOS" | "PENDIENTES" | "EN_CURSO" | "VALIDADOS" | "POR_VENCER";

const FILTROS: { valor: Filtro; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "PENDIENTES", etiqueta: "Sin enviar" },
  { valor: "EN_CURSO", etiqueta: "En validación" },
  { valor: "VALIDADOS", etiqueta: "Validados" },
  { valor: "POR_VENCER", etiqueta: "Por vencer" },
];

function cumpleFiltro(i: RegistroItemDTO, f: Filtro): boolean {
  const e = i.medicion?.estado ?? "PENDIENTE";
  switch (f) {
    case "PENDIENTES":
      return ["PENDIENTE", "BORRADOR", "OBSERVADO"].includes(e);
    case "EN_CURSO":
      return ["ENVIADO", "EN_REVISION"].includes(e);
    case "VALIDADOS":
      return ["APROBADO", "RECTIFICADO"].includes(e);
    case "POR_VENCER":
      return (
        i.ventana.estado === "ABIERTA" &&
        i.ventana.diasRestantes !== null &&
        i.ventana.diasRestantes <= 7
      );
    default:
      return true;
  }
}

/**
 * Listado de los indicadores a cargo (tabla). Es la pantalla de entrada del
 * Registro: desde acá se abre la pantalla de carga de cada indicador, que
 * muestra únicamente ese indicador y su formulario.
 */
export function RegistroTabla({ data }: { data: RegistroDTO }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("TODOS");

  const filas = useMemo(
    () =>
      data.items
        .filter((i) => cumpleFiltro(i, filtro))
        .filter((i) =>
          coincide(
            `${i.codigo} ${i.nombre} ${i.oeCodigo} ${i.aeCodigo ?? ""} ${i.dependenciaPrincipal}`,
            busqueda,
          ),
        ),
    [data.items, busqueda, filtro],
  );

  const href = (codigo: number) =>
    `/registro/indicador/${codigo}?anio=${data.anio}`;

  return (
    <>
      {data.puedeCargar ? (
        <AvisoVencimientos
          anio={data.anio}
          items={data.proximosAVencer}
          onIr={(codigo) => router.push(href(codigo))}
        />
      ) : null}

      <Card>
        <CardHeader
          title="Indicadores a cargo"
          meta={`${data.items.length} del período · ${data.proximosAVencer.length} por vencer`}
        />

        {/* Filtros + buscador */}
        <div className="flex flex-wrap items-center gap-2 border-b border-linea-2 bg-zebra px-3 py-2">
          {FILTROS.map((f) => {
            const n = data.items.filter((i) => cumpleFiltro(i, f.valor)).length;
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltro(f.valor)}
                className={cn(
                  "rounded-chip border px-[10px] py-[3px] text-[11.5px] font-semibold",
                  filtro === f.valor
                    ? "border-azul bg-azul text-white"
                    : "border-linea bg-superficie text-muted hover:bg-hover",
                )}
              >
                {f.etiqueta}
                <span className="ml-[5px] opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <BuscadorLista
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar indicador (código, nombre, objetivo o dependencia)…"
          resultados={filas.length}
        />

        <DataTable
          celdaClassName="px-4 py-[10px]"
          columnas={[
            {
              key: "codigo",
              header: "Cód.",
              movil: "clave",
              tnum: true,
              cell: (i: RegistroItemDTO) => (
                <Link
                  href={href(i.codigo)}
                  className="font-serif font-semibold text-azul-d hover:underline"
                >
                  {i.codigo}
                </Link>
              ),
            },
            {
              key: "nombre",
              header: "Indicador",
              movil: "titulo",
              movilAncho: true,
              cell: (i: RegistroItemDTO) => (
                <Link href={href(i.codigo)} className="block hover:underline">
                  {i.nombre}
                  <span className="mt-[2px] block text-[10.5px] text-muted-2">
                    {i.oeCodigo} · {i.aeCodigo ?? "Nivel OE"} ·{" "}
                    {i.dependenciaPrincipal}
                  </span>
                </Link>
              ),
            },
            {
              key: "estado",
              header: "Estado",
              movil: "insignia",
              cell: (i: RegistroItemDTO) => {
                const c = CHIP[i.medicion?.estado ?? "PENDIENTE"];
                return (
                  <span
                    className={`inline-block whitespace-nowrap rounded-chip px-[8px] py-[2px] text-[10.5px] font-semibold ${c.cls}`}
                  >
                    {c.label}
                  </span>
                );
              },
            },
            {
              key: "plazo",
              header: "Plazo de carga",
              desde: "lg",
              tdClassName: "text-[11.5px]",
              cell: (i: RegistroItemDTO) => {
                if (i.ventana.estado === "CERRADA") {
                  return (
                    <span className="inline-flex items-center gap-[5px] font-semibold text-sem-rojo-fg">
                      <Lock className="h-3.5 w-3.5" />
                      {i.ventana.cierreManual ? "Cerrada" : "Vencido"}
                    </span>
                  );
                }
                if (i.ventana.fechaLimite === null) {
                  return <span className="text-muted-2">Sin plazo</span>;
                }
                const urgente =
                  i.ventana.diasRestantes !== null && i.ventana.diasRestantes <= 7;
                return (
                  <span
                    className={cn(
                      "inline-flex items-center gap-[5px]",
                      urgente ? "font-semibold text-sem-ambar-fg" : "text-muted",
                    )}
                  >
                    {urgente ? <CalendarClock className="h-3.5 w-3.5" /> : null}
                    {fmtFechaCorta(i.ventana.fechaLimite)}
                    {i.ventana.conProrroga ? <Tag>prórroga</Tag> : null}
                  </span>
                );
              },
            },
            {
              key: "accion",
              header: "Acciones",
              movil: "insignia",
              thClassName: "w-[130px] text-center",
              tdClassName: "text-center",
              cell: (i: RegistroItemDTO) => (
                <Link
                  href={href(i.codigo)}
                  title={
                    data.puedeValidar && !data.puedeCargar
                      ? `Revisar la carga del indicador ${i.codigo}`
                      : `Reportar el avance del indicador ${i.codigo}`
                  }
                  className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-pj-sm border border-linea bg-superficie px-[10px] py-[5px] text-[11.5px] font-semibold text-azul-d transition-colors hover:border-azul-line hover:bg-azul-soft agentes:rounded-chip"
                >
                  <ClipboardEdit className="h-3.5 w-3.5" />
                  {data.puedeValidar && !data.puedeCargar ? "Revisar" : "Reportar"}
                </Link>
              ),
            },
          ]}
          filas={filas}
          keyFila={(i) => i.codigo}
          vacio={
            data.items.length === 0
              ? "Su usuario no tiene indicadores asignados para la carga."
              : "Sin indicadores que coincidan con la búsqueda."
          }
        />
      </Card>
    </>
  );
}
