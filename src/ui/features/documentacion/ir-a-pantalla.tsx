import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Enlace directo desde una guía a la pantalla real de la plataforma. */
export function IrAPantalla({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-[6px] rounded-pj border border-azul-line bg-azul-soft px-3 py-[6px] text-[12px] font-semibold text-azul-d hover:bg-azul-soft-hover print:hidden"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
