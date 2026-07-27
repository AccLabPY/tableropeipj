/**
 * Skeleton compartido de las vistas del dashboard: la navegación se siente
 * instantánea aunque el servidor esté computando (Suspense de App Router).
 */
export default function LoadingDashboard() {
  return (
    <section aria-busy="true" aria-label="Cargando…">
      <div className="mb-[6px]">
        <div className="h-[26px] w-64 animate-pulse rounded-pj bg-linea-2" />
        <div className="mt-2 h-[14px] w-96 animate-pulse rounded-pj bg-linea-2" />
      </div>
      <div className="mb-5 mt-[14px] h-px bg-linea" />
      <div className="mb-4 grid grid-cols-5 gap-4 max-[1080px]:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[110px] animate-pulse rounded-pj border border-linea bg-superficie p-4 shadow-card"
          >
            <div className="h-[10px] w-24 rounded bg-linea-2" />
            <div className="mt-3 h-[28px] w-16 rounded bg-linea-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[1.35fr_1fr] gap-4 max-[1080px]:grid-cols-1">
        <div className="h-[320px] animate-pulse rounded-pj border border-linea bg-superficie shadow-card" />
        <div className="h-[320px] animate-pulse rounded-pj border border-linea bg-superficie shadow-card" />
      </div>
    </section>
  );
}
