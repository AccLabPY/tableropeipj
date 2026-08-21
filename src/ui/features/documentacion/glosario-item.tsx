/** Slug ancla del término ("Línea base" → "linea-base"). */
function slug(termino: string): string {
  return termino
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Entrada del glosario metodológico: término + definición (+ ejemplo). */
export function GlosarioItem({
  termino,
  children,
  ejemplo,
}: {
  termino: string;
  children: React.ReactNode;
  ejemplo?: React.ReactNode;
}) {
  return (
    <div
      id={slug(termino)}
      className="border-b border-linea-2 py-4 last:border-b-0 print:break-inside-avoid"
    >
      <dt className="font-serif text-[14.5px] font-semibold text-navy">
        {termino}
      </dt>
      <dd className="mt-[6px] space-y-2 text-[13px] leading-relaxed text-tinta">
        {children}
        {ejemplo ? (
          <div className="mt-2 rounded-pj-sm border border-linea bg-[#FAFBFC] px-3 py-2 text-[12px] text-muted">
            <span className="font-semibold uppercase tracking-[.06em] text-muted-2">
              Ejemplo ·{" "}
            </span>
            {ejemplo}
          </div>
        ) : null}
      </dd>
    </div>
  );
}
