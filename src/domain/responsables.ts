/**
 * Responsabilidad de las dependencias sobre un indicador.
 * PRINCIPAL y CORRESPONSABLE comparten la carga de la misma medición (que
 * queda a nombre de la principal); FUENTE solo provee información y la
 * consulta.
 */
export type RolResponsabilidad = "PRINCIPAL" | "CORRESPONSABLE" | "FUENTE";

export interface Responsable {
  dependenciaId: number;
  rol: RolResponsabilidad;
}

export const ROLES_RESP_CARGA: readonly RolResponsabilidad[] = [
  "PRINCIPAL",
  "CORRESPONSABLE",
];

const PRECEDENCIA: readonly RolResponsabilidad[] = [
  "PRINCIPAL",
  "CORRESPONSABLE",
  "FUENTE",
];

/** Dependencias con alguno de los roles indicados (sin duplicados). */
export function dependenciasResponsables(
  responsables: readonly Responsable[],
  roles: readonly RolResponsabilidad[] = ROLES_RESP_CARGA,
): number[] {
  return [
    ...new Set(
      responsables.filter((r) => roles.includes(r.rol)).map((r) => r.dependenciaId),
    ),
  ];
}

/** Rol de mayor precedencia que tienen las dependencias dadas, o null. */
export function rolDeDependencias(
  responsables: readonly Responsable[],
  dependenciaIds: readonly number[],
): RolResponsabilidad | null {
  const roles = new Set(
    responsables
      .filter((r) => dependenciaIds.includes(r.dependenciaId))
      .map((r) => r.rol),
  );
  return PRECEDENCIA.find((r) => roles.has(r)) ?? null;
}

/** Dependencia principal; si no hay, el primer responsable; si no, null. */
export function dependenciaPrincipal(
  responsables: readonly Responsable[],
): number | null {
  return (
    responsables.find((r) => r.rol === "PRINCIPAL")?.dependenciaId ??
    responsables[0]?.dependenciaId ??
    null
  );
}
