import { Esqueleto, EsqueletoCard, EsqueletoHeader } from "@/ui/components/esqueleto";

/** Skeleton del listado de indicadores a cargo. */
export default function LoadingRegistro() {
  return (
    <section aria-busy="true" aria-label="Cargando indicadores a cargo…">
      <EsqueletoHeader />
      <div className="mb-3 flex flex-wrap gap-2">
        {["w-[88px]", "w-[96px]", "w-[110px]", "w-[96px]", "w-[92px]"].map((w) => (
          <Esqueleto key={w} className={`h-[26px] ${w}`} />
        ))}
      </div>
      <EsqueletoCard className="h-[520px]" />
    </section>
  );
}
