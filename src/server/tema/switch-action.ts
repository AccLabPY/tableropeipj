"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth/auth";
import { prismaControl } from "@/server/db/client";
import { esTema, type Tema } from "@/shared/tema";
import { COOKIE_TEMA } from "./tema";

/**
 * Server Action: cambia el tema visual. Whitelist estricta. Si hay sesión,
 * persiste la preferencia en la cuenta (base de control) para que siga al
 * usuario en cualquier dispositivo; la cookie (1 año) la refleja de inmediato.
 */
export async function setTemaAction(tema: string): Promise<{ ok: boolean; tema: Tema }> {
  if (!esTema(tema)) return { ok: false, tema: "agentes" };

  const session = await auth();
  if (session?.user?.id) {
    await prismaControl().usuario.update({
      where: { id: Number(session.user.id) },
      data: { tema },
    });
  }

  cookies().set(COOKIE_TEMA, tema, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  revalidatePath("/", "layout");
  return { ok: true, tema };
}
