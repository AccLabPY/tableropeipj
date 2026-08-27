/**
 * Ejecución presupuestaria del ejercicio: cifras grandes + barra comparativa
 * asignado vs ejecutado. CSS puro (sin Recharts) para que imprima idéntico en
 * el PDF del Reporte Ejecutivo.
 */
export function BarraPresupuesto({
  asignado,
  ejecutado,
  anio,
}: {
  asignado: number;
  ejecutado: number;
  anio: number;
}) {
  const fmt = (n: number) => new Intl.NumberFormat("es-PY").format(Math.round(n));
  const pct = asignado > 0 ? Math.min(ejecutado / asignado, 1) : 0;
  const pctTexto = asignado > 0 ? Math.round((ejecutado / asignado) * 100) : 0;

  return (
    <div className="print:break-inside-avoid">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cifra rotulo="Presupuesto asignado" valor={`${fmt(asignado)} Gs.`} />
        <Cifra rotulo="Presupuesto ejecutado" valor={`${fmt(ejecutado)} Gs.`} />
        <Cifra
          rotulo="Porcentaje de ejecución"
          valor={`${pctTexto}%`}
          destacado
        />
      </div>

      {/* Comparativa asignado vs ejecutado */}
      <div className="mt-4 space-y-2">
        <Barra
          rotulo={`Asignado ${anio}`}
          ancho={1}
          clase="bg-navy"
          texto={`${fmt(asignado)} Gs.`}
        />
        <Barra
          rotulo={`Ejecutado ${anio}`}
          ancho={pct}
          clase="bg-sem-verde"
          texto={`${fmt(ejecutado)} Gs. · ${pctTexto}%`}
        />
      </div>
    </div>
  );
}

function Cifra({
  rotulo,
  valor,
  destacado,
}: {
  rotulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="rounded-pj border border-linea px-4 py-3 text-center print:break-inside-avoid">
      <div className="text-[11px] uppercase tracking-[.07em] text-muted">
        {rotulo}
      </div>
      <div
        className={`tnum mt-[6px] font-serif leading-none ${
          destacado ? "text-[30px] text-sem-verde-fg" : "text-[22px] text-tinta"
        }`}
      >
        {valor}
      </div>
    </div>
  );
}

function Barra({
  rotulo,
  ancho,
  clase,
  texto,
}: {
  rotulo: string;
  ancho: number;
  clase: string;
  texto: string;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <span className="text-[12px] text-muted">{rotulo}</span>
      <span className="relative block h-[26px] overflow-hidden rounded-pj-sm bg-linea-2">
        <span
          className={`absolute inset-y-0 left-0 ${clase}`}
          style={{ width: `${Math.max(ancho * 100, 2)}%` }}
        />
        <span className="tnum absolute inset-y-0 left-3 flex items-center text-[11.5px] font-semibold text-white mix-blend-luminosity">
          {texto}
        </span>
      </span>
    </div>
  );
}
