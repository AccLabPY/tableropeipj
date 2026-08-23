import { Esqueleto, EsqueletoCard } from "@/ui/components/esqueleto";

/**
 * Skeleton del detalle de carga individual — refleja la diagramación real:
 * fila Volver/acción, cabecera estilo ficha (chips + título + bloque de
 * contexto a la izquierda, dato grande a la derecha), regla, grid 2 columnas
 * (Qué se cargó | Evidencias + Resoluciones) y timeline a todo el ancho.
 */
export default function LoadingDetalleCarga() {
  return (
    <section aria-busy="true" aria-label="Cargando detalle de la carga…">
      {/* Volver + Ver ficha */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Esqueleto className="h-[34px] w-[92px]" />
        <Esqueleto className="h-[34px] w-[180px]" />
      </div>

      {/* Cabecera estilo ficha */}
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[420px]">
          <div className="flex flex-wrap items-center gap-[7px]">
            <Esqueleto className="h-[20px] w-[44px]" />
            <Esqueleto className="h-[20px] w-[60px]" />
            <Esqueleto className="h-[20px] w-[70px]" />
            <Esqueleto className="h-[20px] w-[96px]" />
          </div>
          <Esqueleto className="mt-[10px] h-[28px] w-full max-w-[640px]" />
          <Esqueleto className="mt-2 h-[28px] w-2/3 max-w-[420px]" />
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-[10px] border-l-2 border-linea pl-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <Esqueleto className="h-[10px] w-[140px]" />
              <Esqueleto className="mt-[6px] h-[14px] w-[260px]" />
            </div>
            <div>
              <Esqueleto className="h-[10px] w-[110px]" />
              <Esqueleto className="mt-[6px] h-[14px] w-[90px]" />
            </div>
          </div>
        </div>
        <div className="flex flex-none flex-col items-start gap-[6px] sm:items-end">
          <Esqueleto className="h-[10px] w-[100px]" />
          <Esqueleto className="h-[30px] w-[80px]" />
          <Esqueleto className="h-[18px] w-[72px]" />
        </div>
      </div>
      <div className="mb-5 h-px bg-linea" />

      {/* Grid: Qué se cargó | Evidencias + Resoluciones */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <EsqueletoCard className="h-[280px]" />
        <div className="space-y-4">
          <EsqueletoCard className="h-[120px]" />
          <EsqueletoCard className="h-[140px]" />
        </div>
      </div>

      {/* Timeline */}
      <EsqueletoCard className="mt-4 h-[200px]" />
    </section>
  );
}
