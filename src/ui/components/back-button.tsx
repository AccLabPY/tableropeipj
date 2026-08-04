"use client";

import { useRouter } from "next/navigation";

/** Botón Volver que respeta la página de origen (history back). */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="tap inline-flex items-center gap-[7px] rounded-pj border border-linea bg-superficie px-[13px] py-[7px] text-[12.5px] font-semibold hover:border-azul-line hover:bg-[#F7F9FB]"
    >
      ‹ Volver
    </button>
  );
}
