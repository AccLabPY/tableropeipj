"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "./auth";

export interface EstadoLogin {
  error?: string;
}

/** Server Action del formulario de login. */
export async function loginAction(
  _prev: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/ejecutivo",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }
    throw e; // NEXT_REDIRECT en login exitoso debe propagarse
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
