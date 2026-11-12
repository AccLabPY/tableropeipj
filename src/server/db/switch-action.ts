"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApi } from "@/server/auth/guards";
import { auditar } from "@/server/services/auditoria.service";
import { prismaControl } from "./client";
import { COOKIE_DB_ENV, getDbEnv } from "./env";

/**
 * Server Action: cambia el entorno de datos (prod/test) del ADMIN actual.
 * Whitelist estricta; cualquier otro valor se descarta. La cookie es HttpOnly
 * y solo tiene efecto para sesiones ADMIN (ver getDbEnv).
 */
export async function setDbEnv(env: string): Promise<{ ok: boolean }> {
  const actor = await requireApi("ADMIN");
  const valor = env === "test" ? "test" : "prod";
  const anterior = await getDbEnv();
  if (anterior !== valor) {
    // Se audita antes de fijar la cookie: sin registro no hay cambio.
    await auditar(prismaControl(), actor, valor, {
      accion: "ENTORNO_CAMBIAR",
      entidad: "Sesion",
      entidadId: actor.userId,
      antes: { entorno: anterior },
      despues: { entorno: valor },
    });
  }
  cookies().set(COOKIE_DB_ENV, valor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
