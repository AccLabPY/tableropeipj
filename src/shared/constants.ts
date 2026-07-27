import type { RolUsuario } from "@/domain/types";

export const ROLES: RolUsuario[] = [
  "ADMIN",
  "DGPD_VALIDADOR",
  "DEPENDENCIA_CARGA",
  "AUTORIDAD",
  "CONSULTA",
];

export const ROL_LABEL: Record<RolUsuario, string> = {
  ADMIN: "Administrador",
  DGPD_VALIDADOR: "Validador DGPD",
  DEPENDENCIA_CARGA: "Carga de dependencia",
  AUTORIDAD: "Autoridad",
  CONSULTA: "Consulta",
};

/** Rutas de consulta visibles para todos los roles autenticados. */
const RUTAS_CONSULTA = [
  "/ejecutivo",
  "/objetivos",
  "/acciones",
  "/indicadores",
  "/gobernanza",
];

/** Navegación permitida por rol (el scoping de datos es aparte, en repos). */
export function rutasPermitidas(roles: RolUsuario[]): string[] {
  const r = new Set<string>(RUTAS_CONSULTA);
  if (roles.includes("DEPENDENCIA_CARGA") || roles.includes("ADMIN")) {
    r.add("/registro");
  }
  if (roles.includes("ADMIN") || roles.includes("DGPD_VALIDADOR")) {
    r.add("/registro");
    r.add("/admin");
  }
  return [...r];
}

export const ANIOS_PEI = [2026, 2027, 2028, 2029, 2030] as const;
export type AnioPEI = (typeof ANIOS_PEI)[number];
