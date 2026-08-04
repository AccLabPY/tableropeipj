import { cn } from "@/lib/utils";

/**
 * Rol que cumple la columna dentro de la tarjeta móvil (< md).
 * - `clave`: línea superior breve (ej. código del indicador)
 * - `titulo`: texto principal de la tarjeta
 * - `subtitulo`: texto secundario atenuado
 * - `insignia`: elemento alineado a la derecha (semáforo, tag, acciones)
 * - `campo`: par etiqueta/valor en la rejilla inferior (por defecto)
 * - `oculto`: no se muestra en móvil
 */
export type RolMovil =
  | "clave"
  | "titulo"
  | "subtitulo"
  | "insignia"
  | "campo"
  | "oculto";

export type Columna<T> = {
  key: string;
  header: React.ReactNode;
  cell: (fila: T) => React.ReactNode;
  align?: "left" | "right";
  /** Cifras con numeración tabular */
  tnum?: boolean;
  /** Rol en la tarjeta móvil. Por defecto `campo`. */
  movil?: RolMovil;
  /** El campo ocupa toda la fila de la rejilla móvil (textos largos). */
  movilAncho?: boolean;
  /** Oculta la columna en la tabla de escritorio por debajo de este breakpoint. */
  desde?: "sm" | "md" | "lg" | "xl";
  thClassName?: string;
  tdClassName?: string;
};

const OCULTAR: Record<NonNullable<Columna<unknown>["desde"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

/**
 * Tabla de datos con doble render: tabla clásica desde `md` y tarjetas
 * apiladas por debajo, para que ninguna vista dependa de scroll horizontal
 * en móvil.
 */
export function DataTable<T>({
  columnas,
  filas,
  keyFila,
  vacio = "Sin registros.",
  minAncho,
  celdaClassName,
  sinCabecera,
  className,
}: {
  columnas: Columna<T>[];
  filas: T[];
  keyFila: (fila: T) => string | number;
  vacio?: React.ReactNode;
  /** Ancho mínimo de la tabla en escritorio, ej. `min-w-[520px]`. */
  minAncho?: string;
  /** Clases aplicadas a todas las celdas, ej. `px-4 py-2` para tablas densas. */
  celdaClassName?: string;
  /** Oculta la fila de encabezados en escritorio (listas simples). */
  sinCabecera?: boolean;
  className?: string;
}) {
  const visibles = columnas.filter((c) => c.movil !== "oculto");
  const claves = visibles.filter((c) => c.movil === "clave");
  const titulos = visibles.filter((c) => c.movil === "titulo");
  const subtitulos = visibles.filter((c) => c.movil === "subtitulo");
  const insignias = visibles.filter((c) => c.movil === "insignia");
  const campos = visibles.filter((c) => !c.movil || c.movil === "campo");

  return (
    <div className={className}>
      {/* Escritorio */}
      <div className="hidden overflow-x-auto md:block">
        <table className={cn("w-full border-collapse", minAncho)}>
          {sinCabecera ? null : (
            <thead>
              <tr className="bg-[#FAFBFC] text-left text-2xs uppercase tracking-[.06em] text-muted">
                {columnas.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "border-b border-linea px-3 py-[9px] font-semibold",
                      c.align === "right" && "text-right",
                      c.desde && OCULTAR[c.desde],
                      celdaClassName,
                      c.thClassName,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {filas.map((fila) => (
              <tr key={keyFila(fila)} className="hover:bg-[#F8FAFB]">
                {columnas.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "border-b border-linea-2 px-3 py-[10px] align-top",
                      c.align === "right" && "text-right",
                      c.tnum && "tnum",
                      c.desde && OCULTAR[c.desde],
                      celdaClassName,
                      c.tdClassName,
                    )}
                  >
                    {c.cell(fila)}
                  </td>
                ))}
              </tr>
            ))}
            {filas.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length}
                  className="px-3 py-6 text-center text-muted"
                >
                  {vacio}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Móvil */}
      <ul className="md:hidden">
        {filas.map((fila) => (
          <li
            key={keyFila(fila)}
            className="border-b border-linea-2 px-3 py-3 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {claves.map((c) => (
                  <div key={c.key} className="text-[12.5px] leading-tight">
                    {c.cell(fila)}
                  </div>
                ))}
                {titulos.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "text-[13px] leading-snug",
                      claves.length > 0 && "mt-[2px]",
                    )}
                  >
                    {c.cell(fila)}
                  </div>
                ))}
                {subtitulos.map((c) => (
                  <div
                    key={c.key}
                    className="mt-[2px] text-[11.5px] leading-snug text-muted-2"
                  >
                    {c.cell(fila)}
                  </div>
                ))}
              </div>
              {insignias.length > 0 ? (
                <div className="flex flex-none flex-col items-end gap-1">
                  {insignias.map((c) => (
                    <div key={c.key}>{c.cell(fila)}</div>
                  ))}
                </div>
              ) : null}
            </div>

            {campos.length > 0 ? (
              <dl className="mt-[10px] grid grid-cols-2 gap-x-3 gap-y-[6px] xs:grid-cols-3">
                {campos.map((c) => (
                  <div
                    key={c.key}
                    className={cn(
                      "min-w-0",
                      c.movilAncho && "col-span-2 xs:col-span-3",
                    )}
                  >
                    <dt className="text-2xs uppercase tracking-[.06em] text-muted">
                      {c.header}
                    </dt>
                    <dd
                      className={cn(
                        "mt-[1px] text-[12.5px]",
                        c.tnum && "tnum",
                      )}
                    >
                      {c.cell(fila)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
        {filas.length === 0 ? (
          <li className="px-3 py-6 text-center text-muted">{vacio}</li>
        ) : null}
      </ul>
    </div>
  );
}
