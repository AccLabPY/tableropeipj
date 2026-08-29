import { FileText } from "lucide-react";

/**
 * Acceso contextual al reporte imprimible de la vista actual.
 * `etiqueta` es el texto compacto (móvil); `etiquetaLarga`, el de escritorio.
 */
export function LinkExportar({
  href,
  etiqueta = "PDF",
  etiquetaLarga,
}: {
  href: string;
  etiqueta?: string;
  etiquetaLarga?: string;
}) {
  const larga = etiquetaLarga ?? etiqueta;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={larga}
      className="inline-flex flex-none items-center gap-[6px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-3 py-[6px] text-[11.5px] font-semibold text-tinta hover:bg-hover agentes:rounded-chip"
    >
      <FileText className="h-3.5 w-3.5 text-azul-d" />
      <span className="sm:hidden">{etiqueta}</span>
      <span className="hidden sm:inline">{larga}</span>
    </a>
  );
}
