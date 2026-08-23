"use client";

import { useEffect, useState } from "react";

function texto(): string {
  const d = new Date();
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dias[d.getDay()]} ${p(d.getDate())} de ${meses[d.getMonth()]} de ${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())} · Asunción — Paraguay`;
}

/** Reloj es-PY del AppBar. Se hidrata en cliente para evitar mismatch SSR. */
export function Clock() {
  const [t, setT] = useState<string>("Asunción — Paraguay");
  useEffect(() => {
    setT(texto());
    const id = setInterval(() => setT(texto()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-[11.5px] tracking-wide text-azul-line">{t}</span>
  );
}
