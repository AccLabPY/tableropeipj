"use client";

import { m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const BLOBS = [
  { cls: "left-[-8%] top-[-10%] h-[42vmax] w-[42vmax] bg-azul", dur: 14, dx: 18, dy: -14 },
  { cls: "right-[-10%] top-[10%] h-[36vmax] w-[36vmax] bg-marca-2", dur: 17, dx: -16, dy: 12 },
  { cls: "bottom-[-14%] left-[20%] h-[38vmax] w-[38vmax] bg-marca-3", dur: 19, dx: 14, dy: -10 },
];

/**
 * Blobs orgánicos de la identidad Agentes PEI flotando suavemente de fondo
 * (login / hero). Decorativos: aria-hidden, sin interacción, y estáticos
 * con prefers-reduced-motion.
 */
export function BlobsFondo({
  intensidad = "suave",
  className,
}: {
  intensidad?: "suave" | "marcada";
  className?: string;
}) {
  const reducido = useReducedMotion();
  const opacidad = intensidad === "marcada" ? "opacity-40" : "opacity-25";
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {BLOBS.map((b, i) => (
        <m.div
          key={i}
          className={cn("absolute rounded-full blur-3xl", opacidad, b.cls)}
          animate={reducido ? undefined : { x: [0, b.dx, 0], y: [0, b.dy, 0] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
