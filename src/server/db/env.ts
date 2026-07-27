import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import { prismaFor, type DbEnv } from "./client";
import { getActor, type Actor } from "@/server/auth/guards";

export const COOKIE_DB_ENV = "pei-db-env";

function envPorDefecto(): DbEnv {
  return process.env.DB_DEFAULT_ENV === "test" ? "test" : "prod";
}

/**
 * Entorno de datos activo del request.
 * GUARDA DURA: para cualquier usuario que no sea ADMIN la cookie se IGNORA
 * (no se "valida"): siempre recibe el entorno por defecto. Solo un ADMIN puede
 * estar mirando la base de prueba, y siempre con el banner MODO PRUEBA visible.
 */
export async function getDbEnv(): Promise<DbEnv> {
  const actor = await getActor();
  if (!actor?.roles.includes("ADMIN")) return envPorDefecto();
  const c = cookies(); // Next 14 sync; envolver en await al migrar a 15
  const v = c.get(COOKIE_DB_ENV)?.value;
  return v === "test" ? "test" : v === "prod" ? "prod" : envPorDefecto();
}

/** ÚNICO punto de acceso a Prisma para services y repositorios. */
export async function getDb(): Promise<PrismaClient> {
  return prismaFor(await getDbEnv());
}

/** Contexto estándar que reciben los repositorios: cliente + actor + entorno. */
export interface Ctx {
  db: PrismaClient;
  actor: Actor;
  /** Entorno de datos activo — clave de los cachés en memoria. */
  env: DbEnv;
}

/** Construye el Ctx del request (db según entorno activo + actor de sesión). */
export async function getCtx(actor: Actor): Promise<Ctx> {
  const env = await getDbEnv();
  return { db: prismaFor(env), actor, env };
}
