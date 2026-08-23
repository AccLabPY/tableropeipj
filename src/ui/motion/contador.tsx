"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { useTema } from "@/ui/tema/tema-provider";

/**
 * Cifra que "sube" desde 0 hasta `valor` al montarse (KPIs). Recibe el
 * texto ya formateado via `formatear` para respetar es-PY. Solo anima en el
 * tema Agentes y sin reduced-motion; si no, muestra el valor directo.
 */
export function Contador({
  valor,
  formatear,
  duracion = 0.9,
}: {
  valor: number | null;
  formatear: (v: number | null) => string;
  duracion?: number;
}) {
  const tema = useTema();
  const reducido = useReducedMotion();
  const animar = tema === "agentes" && !reducido && valor !== null;
  const [mostrado, setMostrado] = useState<number | null>(animar ? 0 : valor);
  const ultimo = useRef(valor);

  useEffect(() => {
    if (!animar || valor === null) {
      setMostrado(valor);
      return;
    }
    const desde = ultimo.current ?? 0;
    ultimo.current = valor;
    const controles = animate(desde, valor, {
      duration: duracion,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setMostrado(v),
    });
    return () => controles.stop();
  }, [animar, valor, duracion]);

  return <>{formatear(mostrado)}</>;
}
