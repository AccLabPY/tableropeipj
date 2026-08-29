"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ANIOS_CONSULTA, ANIO_REFERENCIA } from "@/shared/constants";

/** Selector de ejercicio (?anio=) compartido por las vistas. */
export function AnioSelector({ anio }: { anio: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex flex-none items-center gap-2 text-[11px] text-muted">
      Ejercicio
      <select
        value={anio}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("anio", e.target.value);
          router.push(`${pathname}?${p.toString()}`);
        }}
        className="flex-none rounded-pj border border-linea bg-superficie px-2 py-[6px] text-[12.5px] text-tinta agentes:rounded-chip"
      >
        {ANIOS_CONSULTA.map((a) => (
          <option key={a} value={a}>
            {a === ANIO_REFERENCIA ? `${a} (ref.)` : a}
          </option>
        ))}
      </select>
    </label>
  );
}
