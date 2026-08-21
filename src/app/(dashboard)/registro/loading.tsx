import {
  Esqueleto,
  EsqueletoCard,
  EsqueletoHeader,
} from "@/ui/components/esqueleto";

/** Skeleton del Registro: worklist + formulario. */
export default function LoadingRegistro() {
  return (
    <section aria-busy="true" aria-label="Cargando registro…">
      <EsqueletoHeader />
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]">
        <EsqueletoCard className="h-[300px] md:h-[560px]" />
        <div className="space-y-4">
          <EsqueletoCard className="h-[120px]" />
          <EsqueletoCard className="h-[160px]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Esqueleto className="h-[64px]" />
            <Esqueleto className="h-[64px]" />
          </div>
          <EsqueletoCard className="h-[90px]" />
        </div>
      </div>
    </section>
  );
}
