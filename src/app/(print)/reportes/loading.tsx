import { Esqueleto } from "@/ui/components/esqueleto";

/** Skeleton de los reportes imprimibles (membrete + bloques). */
export default function LoadingReporteImprimible() {
  return (
    <div aria-busy="true" aria-label="Generando reporte…">
      <Esqueleto className="h-[76px] w-full rounded-pj bg-navy/20" />
      <Esqueleto className="mt-4 h-[110px] w-full" />
      <Esqueleto className="mt-4 h-[260px] w-full" />
      <Esqueleto className="mt-4 h-[200px] w-full" />
      <p className="mt-6 text-center text-[12px] text-muted">
        Generando el reporte con los datos oficiales…
      </p>
    </div>
  );
}
