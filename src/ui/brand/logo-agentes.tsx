"use client";

import { m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Logo "Agentes PEI" (SVG inline, recreado a partir de la identidad del
 * programa). `animado`: los círculos flotan suavemente (hero/login).
 */
export function LogoAgentes({
  className,
  animado = false,
  titulo = "Agentes PEI",
}: {
  className?: string;
  animado?: boolean;
  titulo?: string;
}) {
  const reducido = useReducedMotion();
  const mover = animado && !reducido;
  const flota = (dy: number, dur: number) =>
    mover
      ? {
          animate: { y: [0, dy, 0] },
          transition: { duration: dur, repeat: Infinity, ease: "easeInOut" as const },
        }
      : {};

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={titulo}
      className={cn("h-10 w-10", className)}
    >
      <m.g {...flota(-2, 5)}>
        <rect x="42" y="2" width="36" height="116" rx="18" fill="#f26f1b" />
        <rect x="2" y="42" width="116" height="36" rx="18" fill="#f26f1b" />
      </m.g>
      <m.g {...flota(2, 6)}>
        <line x1="60" y1="60" x2="100" y2="20" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
        <line x1="60" y1="60" x2="100" y2="20" stroke="#bf3085" strokeWidth="36" strokeLinecap="round" />
      </m.g>
      <m.circle cx="20" cy="20" r="18" fill="#007cc2" stroke="#fff" strokeWidth="3" {...flota(-3, 4.5)} />
      <m.circle cx="20" cy="100" r="18" fill="#0b68b1" stroke="#fff" strokeWidth="3" {...flota(3, 5.5)} />
      <m.g {...flota(-2, 4)}>
        <circle cx="100" cy="100" r="18" fill="#fff" stroke="#007cc2" strokeWidth="2.5" />
        <path
          d="M92 108 L107 93 M98 93 H107 V102"
          fill="none"
          stroke="#007cc2"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </m.g>
    </svg>
  );
}
