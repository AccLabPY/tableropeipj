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
];

/**
 * Listado de navegación compartido entre la sidebar de escritorio y el
 * drawer móvil. `allowedHrefs` (calculado server-side por rol) filtra las
 * entradas visibles.
 */
export function NavLinks({
  allowedHrefs,
  onNavigate,
}: {
  allowedHrefs?: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = NAV.map((g) => ({
    ...g,
    items: allowedHrefs
      ? g.items.filter((i) => allowedHrefs.includes(i.href))
      : g.items,
  })).filter((g) => g.items.length > 0);

  return (
    <nav aria-label="Navegación principal">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="px-4 pb-1 pt-[6px] text-[10px] uppercase tracking-[.14em] text-muted-2">
            {g.title}
          </div>
          {g.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-[11px] border-l-[3px] border-transparent px-4 py-[10px] text-tinta hover:bg-[#F7F9FB]",
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
