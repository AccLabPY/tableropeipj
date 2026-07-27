"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireApi } from "@/server/auth/guards";
import { COOKIE_DB_ENV } from "./env";

/**
 * Server Action: cambia el entorno de datos (prod/test) del ADMIN actual.
 * Whitelist estricta; cualquier otro valor se descarta. La cookie es HttpOnly
 * y solo tiene efecto para sesiones ADMIN (ver getDbEnv).
 */
export async function setDbEnv(env: string): Promise<{ ok: boolean }> {
  await requireApi("ADMIN");
  const valor = env === "test" ? "test" : "prod";
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
