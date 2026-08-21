/** Paso numerado de un walkthrough: círculo navy + título + cuerpo. */
export function Paso({
  n,
  titulo,
  children,
}: {
  n: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-b border-linea-2 py-5 last:border-b-0 print:break-inside-avoid">
      <div className="flex-none">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-navy font-serif text-[14px] font-semibold text-white">
          {n}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[15px] font-semibold text-tinta">
          {titulo}
        </h3>
        <div className="mt-2 space-y-3 text-[13px] leading-relaxed text-tinta">
          {children}
        </div>
      </div>
    </div>
  );
}
