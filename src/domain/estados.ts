import type { EstadoWF, RolUsuario } from "./types";

/**
 * Máquina de estados del workflow de mediciones (§11):
 *   BORRADOR → ENVIADO → EN_REVISION → { OBSERVADO↺, APROBADO }
 *   OBSERVADO → ENVIADO (la dependencia corrige y reenvía)
 *   RECHAZADO quedó retirado del circuito en 2026: existe solo en mediciones
 *   históricas, que admiten iniciar una versión nueva (lo resuelve el service).
 *   APROBADO → RECTIFICADO (solo vía rectificación: crea versión nueva,
 *              conserva la anterior — append-only)
 * El validador puede resolver directamente desde ENVIADO sin pasar por
 * EN_REVISION (EN_REVISION es el estado "tomado para revisión").
 * Toda transición debe registrar HistorialEstado (lo hace el service).
 */

const ROLES_CARGA: RolUsuario[] = ["DEPENDENCIA_CARGA", "ADMIN"];
const ROLES_VALIDACION: RolUsuario[] = ["DGPD_VALIDADOR", "ADMIN"];

interface Transicion {
  hacia: EstadoWF;
  roles: RolUsuario[];
}

const MAQUINA: Record<EstadoWF, Transicion[]> = {
  BORRADOR: [{ hacia: "ENVIADO", roles: ROLES_CARGA }],
  ENVIADO: [
    { hacia: "EN_REVISION", roles: ROLES_VALIDACION },
    { hacia: "APROBADO", roles: ROLES_VALIDACION },
    { hacia: "OBSERVADO", roles: ROLES_VALIDACION },
  ],
  EN_REVISION: [
    { hacia: "APROBADO", roles: ROLES_VALIDACION },
    { hacia: "OBSERVADO", roles: ROLES_VALIDACION },
  ],
  OBSERVADO: [{ hacia: "ENVIADO", roles: ROLES_CARGA }],
  APROBADO: [{ hacia: "RECTIFICADO", roles: ROLES_VALIDACION }],
  RECHAZADO: [],
  RECTIFICADO: [],
};

/** Estados desde los que la dependencia puede editar el contenido. */
export const ESTADOS_EDITABLES: EstadoWF[] = ["BORRADOR", "OBSERVADO"];

/**
 * Estados cuya última versión admite que la dependencia inicie una versión
 * nueva en BORRADOR (v+1) en lugar de editarla.
 */
export const ESTADOS_NUEVA_VERSION: EstadoWF[] = ["RECHAZADO"];

/** Estados en los que se pueden adjuntar evidencias (o iniciar v+1). */
export function admiteEvidencias(estado: EstadoWF): boolean {
  return ESTADOS_EDITABLES.includes(estado) || ESTADOS_NUEVA_VERSION.includes(estado);
}

/**
 * Regla de autovalidación: quien intervino en una versión (la cargó, editó,
 * adjuntó evidencias o la envió) no puede tomarla en revisión ni resolverla.
 */
export function esAutovalidacion(
  actorId: number,
  intervinientesIds: readonly number[],
): boolean {
  return intervinientesIds.includes(actorId);
}

/** Único estado que alimenta los dashboards oficiales. */
export const ESTADO_OFICIAL: EstadoWF = "APROBADO";

export function transicionesDesde(desde: EstadoWF): EstadoWF[] {
  return MAQUINA[desde].map((t) => t.hacia);
}

export function puedeTransicionar(desde: EstadoWF, hacia: EstadoWF): boolean {
  return MAQUINA[desde].some((t) => t.hacia === hacia);
}

export function rolesPermitidos(
  desde: EstadoWF,
  hacia: EstadoWF,
): RolUsuario[] {
  return MAQUINA[desde].find((t) => t.hacia === hacia)?.roles ?? [];
}

export interface ResultadoTransicion {
  ok: boolean;
  error?: "TRANSICION_INVALIDA" | "ROL_NO_AUTORIZADO";
}

/** Valida la transición y que alguno de los roles del actor esté autorizado. */
export function validarTransicion(
  desde: EstadoWF,
  hacia: EstadoWF,
  rolesActor: RolUsuario[],
): ResultadoTransicion {
  const t = MAQUINA[desde].find((x) => x.hacia === hacia);
  if (!t) return { ok: false, error: "TRANSICION_INVALIDA" };
  if (!t.roles.some((r) => rolesActor.includes(r)))
    return { ok: false, error: "ROL_NO_AUTORIZADO" };
  return { ok: true };
}
