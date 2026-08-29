/**
 * Encabezado estándar de página.
 *  - Clásico: título serif + subtítulo + regla.
 *  - Agentes: banda "hero" con gradiente de marca, título Poppins blanco,
 *    sin regla (variante `agentes:` de Tailwind; sin lógica en JS).
 */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <>
      <div className="relative mb-[6px] flex flex-wrap items-end justify-between gap-x-4 gap-y-2 agentes:mb-6 agentes:overflow-hidden agentes:rounded-pj agentes:bg-hero agentes:px-5 agentes:py-5 agentes:text-white agentes:shadow-card sm:agentes:px-7 sm:agentes:py-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-14 hidden h-44 w-44 rounded-full bg-white/10 agentes:block"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 right-24 hidden h-36 w-36 rounded-full bg-marca-2/35 agentes:block"
        />
        <div className="relative min-w-0">
          <h1 className="font-serif text-titulo font-semibold agentes:text-[24px] agentes:font-bold agentes:leading-tight agentes:tracking-tight sm:agentes:text-[28px]">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-[3px] text-[12.5px] text-muted agentes:mt-[6px] agentes:text-[13px] agentes:text-white/85">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? (
          <div className="relative flex w-full flex-wrap items-center justify-end gap-2 agentes:[&_label]:text-white/90 sm:w-auto">
            {right}
          </div>
        ) : null}
      </div>
      <div className="mb-5 mt-[14px] h-px bg-linea agentes:hidden" />
    </>
  );
}

/** Nota ámbar de contexto (ej. "datos de ejemplo"). */
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-pj-sm border border-sem-ambar-border bg-sem-ambar-bg px-[9px] py-1 text-[11px] text-sem-ambar">
      {children}
    </div>
  );
}
