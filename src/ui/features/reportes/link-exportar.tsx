import { FileText } from "lucide-react";

/** Acceso contextual al reporte imprimible de la vista actual. */
export function LinkExportar({
  href,
  etiqueta = "PDF",
  titulo = "Abrir el reporte imprimible",
}: {
  href: string;
  etiqueta?: string;
  titulo?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={titulo}
      className="tap inline-flex h-[34px] flex-none items-center gap-[6px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-3 text-[12px] font-semibold text-tinta hover:border-azul-line hover:bg-hover agentes:rounded-chip"
    >
      <FileText className="h-[15px] w-[15px] text-azul-d" />
      {etiqueta}
    </a>
  );
}
