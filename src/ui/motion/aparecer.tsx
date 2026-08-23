"use client";

import { m, useReducedMotion } from "framer-motion";
import { useTema } from "@/ui/tema/tema-provider";

/**
 * Entrada suave (fade + desplazamiento) — solo en el tema Agentes y solo si
 * el usuario no pidió reducir el movimiento. En clásico renderiza plano.
 */
export function Aparecer({
  children,
  retraso = 0,
  className,
}: {
  children: React.ReactNode;
  retraso?: number;
  className?: string;
}) {
  const tema = useTema();
  const reducido = useReducedMotion();
  if (tema !== "agentes" || reducido) {
    return <div className={className}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: retraso }}
    >
      {children}
    </m.div>
  );
}
