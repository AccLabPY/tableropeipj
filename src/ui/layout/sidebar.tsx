"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Network,
  ListOrdered,
  ClipboardEdit,
  ShieldCheck,
  Settings,
  Printer,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};
type Group = { title: string; items: Item[] };

const NAV: Group[] = [
  {
    title: "Seguimiento",
    items: [
      { href: "/ejecutivo", label: "Tablero ejecutivo", icon: LayoutDashboard },
      { href: "/objetivos", label: "Objetivos estratégicos", icon: Target },
      { href: "/acciones", label: "Acciones estratégicas", icon: Network },
      { href: "/indicadores", label: "Indicadores", icon: ListOrdered },
      { href: "/gobernanza", label: "Gobernanza", icon: ShieldCheck },
      { href: "/reportes", label: "Reportes", icon: Printer },
    ],
  },
  {
    title: "Registro",
    items: [
      { href: "/registro", label: "Carga de avances", icon: ClipboardEdit },
    ],
  },
  {
    title: "Configuración",
    items: [{ href: "/admin", label: "Administración", icon: Settings }],
  },
  {
    title: "Ayuda",
    items: [
      { href: "/documentacion", label: "Documentación", icon: BookOpen },
    ],
  },
];

/** Color de acento por grupo (tema Agentes: iconos en círculos de color). */
const ACENTO_GRUPO: Record<string, string> = {
  Seguimiento: "bg-azul/10 text-azul",
  Registro: "bg-marca-3/15 text-marca-3-d",
  Configuración: "bg-marca-2/10 text-marca-2",
  Ayuda: "bg-sem-verde/10 text-sem-verde",
};

/**
 * Listado de navegación compartido entre la sidebar de escritorio y el
 * drawer móvil. `allowedHrefs` (calculado server-side por rol) filtra las
 * entradas visibles. `variante` cambia el lenguaje visual:
 *  - clasico: filas con borde izquierdo azul (institucional)
 *  - agentes: pills redondeadas con icono en círculo de color por grupo
 */
export function NavLinks({
  allowedHrefs,
  onNavigate,
  variante = "clasico",
}: {
  allowedHrefs?: string[];
  onNavigate?: () => void;
  variante?: "clasico" | "agentes";
}) {
  const pathname = usePathname();
  const groups = NAV.map((g) => ({
    ...g,
    items: allowedHrefs
      ? g.items.filter((i) => allowedHrefs.includes(i.href))
      : g.items,
  })).filter((g) => g.items.length > 0);
  const agentes = variante === "agentes";

  return (
    <nav aria-label="Navegación principal" className={cn(agentes && "space-y-3 px-2")}>
      {groups.map((g) => (
        <div key={g.title}>
          <div
            className={cn(
              "pb-1 pt-[6px] text-[10px] uppercase tracking-[.14em] text-muted-2",
              agentes ? "px-3 font-semibold" : "px-4",
            )}
          >
            {g.title}
          </div>
          {g.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            if (agentes) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "my-[2px] flex min-h-[44px] items-center gap-[10px] rounded-chip px-[10px] py-[7px] text-[13px] text-tinta transition-colors hover:bg-hover lg:min-h-0",
                    active && "bg-azul-soft font-semibold text-azul-d",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 flex-none place-items-center rounded-full",
                      active ? "bg-marca text-white" : ACENTO_GRUPO[g.title] ?? "bg-azul/10 text-azul",
                    )}
                  >
                    <Icon className="h-[15px] w-[15px]" />
                  </span>
                  {item.label}
                </Link>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center gap-[11px] border-l-[3px] border-transparent px-4 py-[10px] text-tinta hover:bg-hover lg:min-h-0",
                  active &&
                    "border-azul bg-azul-soft font-semibold text-azul-d",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 flex-none text-muted",
                    active && "text-azul",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Barra lateral de escritorio (oculta en móvil; ver MobileNav). */
export function Sidebar({ allowedHrefs }: { allowedHrefs?: string[] }) {
  return (
    <aside className="h-full border-r border-linea bg-superficie py-[14px]">
      <NavLinks allowedHrefs={allowedHrefs} />
    </aside>
  );
}

/** Barra lateral del tema Agentes: panel flotante redondeado sobre la crema. */
export function SidebarAgentes({ allowedHrefs }: { allowedHrefs?: string[] }) {
  return (
    <aside className="h-full py-4 pl-3">
      <div className="sticky top-[76px] rounded-pj border border-linea bg-superficie py-3 shadow-card">
        <NavLinks allowedHrefs={allowedHrefs} variante="agentes" />
      </div>
    </aside>
  );
}
