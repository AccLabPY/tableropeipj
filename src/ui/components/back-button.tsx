"use client";

import { useRouter } from "next/navigation";

/** Botón Volver que respeta la página de origen (history back). */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="tap inline-flex h-[34px] flex-none items-center gap-[7px] whitespace-nowrap rounded-pj border border-linea bg-superficie px-[13px] text-[12px] font-semibold hover:border-azul-line hover:bg-hover agentes:rounded-chip"
    >
      ‹ Volver
    </button>
  );
}
