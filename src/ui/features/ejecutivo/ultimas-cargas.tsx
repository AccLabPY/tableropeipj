import Link from "next/link";
import type { UltimaCargaDTO } from "@/shared/dtos/ultimas-cargas";
import { Card, CardHeader, Tag } from "@/ui/components/card";
import { fmtFechaCorta, fmtValor } from "@/lib/utils";

/**
 * Widget "at a glance" de las últimas mediciones aprobadas (cargas reales),
 * de cualquier ejercicio — las filas enlazan a la ficha del indicador.
 */
export function UltimasCargas({ cargas }: { cargas: UltimaCargaDTO[] }) {
  return (
    <Card className="mt-4">
      <CardHeader
        title="Últimas cargas aprobadas"
        meta="mediciones oficiales más recientes, todos los ejercicios"
      />
      {cargas.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-muted">
          Aún no hay mediciones aprobadas registradas.
        </div>
      ) : (
        <ul className="divide-y divide-linea-2">
          {cargas.map((c) => (
            <li key={c.id}>
              <Link
                href={`/indicadores/${c.codigo}?anio=${c.periodoAnio}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-[10px] hover:bg-[#F8FAFB]"
              >
                <span className="font-serif text-[13.5px] font-semibold text-azul-d">
                  {c.codigo}
                </span>
                <span className="min-w-0 flex-1 basis-52 truncate text-[12.5px]">
                  {c.nombre}
                </span>
                <Tag>
                  {c.periodoAnio}
                  {c.fechaCorte && !c.fechaCorte.startsWith(`${c.periodoAnio}-12-31`)
                    ? ` · corte ${fmtFechaCorta(c.fechaCorte)}`
                    : ""}
                </Tag>
                <span className="tnum text-[13px] font-semibold">
                  {fmtValor(c.valor, c.unidad)}
                </span>
                <span className="hidden max-w-[260px] truncate text-[11px] text-muted lg:inline">
                  {c.fuente ?? c.dependencia}
                </span>
                <span className="tnum text-[11px] text-muted">
                  {fmtFechaCorta(c.fechaReporte)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
