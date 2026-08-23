import { FileText } from "lucide-react";

/** Acceso contextual al reporte imprimible de la vista actual. */
export function LinkExportar({
  href,
  etiqueta = "Exportar PDF",
}: {
  href: string;
  etiqueta?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-tinta hover:bg-hover"
    >
      <FileText className="h-3.5 w-3.5 text-azul-d" />
      {etiqueta}
    </a>
  );
}
