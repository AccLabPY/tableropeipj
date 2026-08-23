"use client";

import { createContext, useContext } from "react";
import { TEMA_DEFAULT, type Tema } from "@/shared/tema";

const TemaContext = createContext<Tema>(TEMA_DEFAULT);

/**
 * Expone el tema resuelto en el servidor a los client components
 * (nunca se lee de `document`: evita desajustes de hidratación).
 */
export function TemaProvider({
  tema,
  children,
}: {
  tema: Tema;
  children: React.ReactNode;
}) {
  return <TemaContext.Provider value={tema}>{children}</TemaContext.Provider>;
}

export function useTema(): Tema {
  return useContext(TemaContext);
}
