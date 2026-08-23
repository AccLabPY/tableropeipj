"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Carga diferida del motor de animación (LazyMotion + domAnimation):
 * los componentes usan `m.*` en vez de `motion.*` para mantener el bundle
 * mínimo. `strict` garantiza que nadie importe `motion` completo por error.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
