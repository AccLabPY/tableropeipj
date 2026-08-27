import { Esqueleto, EsqueletoCard } from "@/ui/components/esqueleto";

/** Skeleton de la pantalla de carga de un indicador (encabezado tipo ficha). */
export default function LoadingRegistroIndicador() {
  return (
    <section aria-busy="true" aria-label="Cargando el formulario de carga…">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Esqueleto className="h-[34px] w-[190px]" />
        <Esqueleto className="h-[32px] w-[180px]" />
      </div>
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1 basis-full sm:basis-[420px]">
          <div className="flex flex-wrap items-center gap-[7px]">
            <Esqueleto className="h-[20px] w-[44px]" />
            <Esqueleto className="h-[20px] w-[62px]" />
            <Esqueleto className="h-[20px] w-[92px]" />
          </div>
          <Esqueleto className="mt-[10px] h-[26px] w-full max-w-[620px]" />
          <Esqueleto className="mt-2 h-[26px] w-2/3 max-w-[420px]" />
          <div className="mt-3 grid grid-cols-1 gap-x-10 gap-y-[10px] border-l-2 border-linea pl-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div>
              <Esqueleto className="h-[10px] w-[150px]" />
              <Esqueleto className="mt-[6px] h-[14px] w-[260px]" />
            </div>
            <div>
              <Esqueleto className="h-[10px] w-[110px]" />
              <Esqueleto className="mt-[6px] h-[14px] w-[120px]" />
            </div>
          </div>
        </div>
        <div className="flex flex-none flex-col items-start gap-[6px] sm:items-end">
          <Esqueleto className="h-[10px] w-[130px]" />
          <Esqueleto className="h-[20px] w-[80px]" />
        </div>
      </div>
      <div className="mb-5 h-px bg-linea" />
      <EsqueletoCard className="h-[520px]" />
    </section>
  );
}
