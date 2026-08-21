import {
  Esqueleto,
  EsqueletoCard,
} from "@/ui/components/esqueleto";

/** Skeleton de la ficha de indicador. */
export default function LoadingFicha() {
  return (
    <section aria-busy="true" aria-label="Cargando ficha…">
      <Esqueleto className="h-[30px] w-24" />
      <div className="my-[14px] flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 basis-[420px] space-y-3">
          <div className="flex gap-2">
            <Esqueleto className="h-[22px] w-14" />
            <Esqueleto className="h-[22px] w-16" />
            <Esqueleto className="h-[22px] w-20" />
          </div>
          <Esqueleto className="h-[24px] w-full max-w-[560px]" />
          <Esqueleto className="h-[52px] w-full max-w-[640px]" />
        </div>
        <Esqueleto className="h-[76px] w-32" />
      </div>
      <div className="mb-4 h-px bg-linea" />
      <div className="mb-4 grid grid-cols-1 gap-[10px] xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <EsqueletoCard key={i} className="h-[64px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <EsqueletoCard className="h-[320px]" />
        <EsqueletoCard className="h-[320px]" />
      </div>
    </section>
  );
}
