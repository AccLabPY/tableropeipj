import { redirect } from "next/navigation";
import { auth } from "./auth";
import { noAutenticado, sinPermiso } from "@/server/api/api-error";
import type { RolUsuario } from "@/domain/types";

/** Identidad resuelta del request: alimenta el scoping de los repositorios. */
export interface Actor {
  userId: number;
  nombre: string;
  email: string;
  roles: RolUsuario[];
  dependenciaIds: number[];
}

/** Roles que ven TODOS los datos (el scoping por fila aplica solo a carga). */
export const ROLES_VISION_TOTAL: RolUsuario[] = [
  "ADMIN",
  "DGPD_VALIDADOR",
  "AUTORIDAD",
  "CONSULTA",
];

export function tieneRol(actor: Actor, ...roles: RolUsuario[]): boolean {
  return roles.some((r) => actor.roles.includes(r));
}

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    userId: Number(session.user.id),
    nombre: session.user.name ?? "",
    email: session.user.email ?? "",
    roles: session.user.roles ?? [],
    dependenciaIds: session.user.dependenciaIds ?? [],
  };
}

/** Guard de páginas (Server Components): redirige si no cumple. */
export async function requirePage(...roles: RolUsuario[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (roles.length && !tieneRol(actor, ...roles)) redirect("/ejecutivo");
  return actor;
}

/** Guard de API (Route Handlers / Server Actions): lanza ApiError. */
export async function requireApi(...roles: RolUsuario[]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw noAutenticado();
  if (roles.length && !tieneRol(actor, ...roles)) throw sinPermiso();
  return actor;
}
