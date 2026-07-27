/** Encabezado estándar de página: título serif + subtítulo + nota opcional. */
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
      <div className="mb-[6px] flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="font-serif text-[22px] font-semibold">{title}</h1>
          {subtitle ? (
            <div className="mt-[3px] text-[12.5px] text-muted">{subtitle}</div>
          ) : null}
        </div>
        {right}
      </div>
      <div className="mb-5 mt-[14px] h-px bg-linea" />
    </>
  );
}

/** Nota ámbar de contexto (ej. "datos de ejemplo"). */
export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="whitespace-nowrap rounded-pj-sm border border-[#EAD9AE] bg-sem-ambar-bg px-[9px] py-1 text-[11px] text-sem-ambar">
      {children}
    </div>
  );
}
