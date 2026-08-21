import { EsqueletoCard, EsqueletoHeader } from "@/ui/components/esqueleto";

/** Skeleton del hub de reportes. */
export default function LoadingReportes() {
  return (
    <section aria-busy="true" aria-label="Cargando reportes…">
      <EsqueletoHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <EsqueletoCard key={i} className="h-[170px]" />
        ))}
      </div>
    </section>
  );
}
