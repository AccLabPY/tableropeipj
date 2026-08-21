import { EsqueletoCard, EsqueletoHeader } from "@/ui/components/esqueleto";

/** Skeleton de la sección Documentación. */
export default function LoadingDocumentacion() {
  return (
    <section aria-busy="true" aria-label="Cargando documentación…">
      <EsqueletoHeader />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <EsqueletoCard key={i} className="h-[140px]" />
        ))}
      </div>
    </section>
  );
}
