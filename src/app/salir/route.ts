import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth/auth";

export const dynamic = "force-dynamic";

/**
 * Cierre de una sesión revocada o vencida: limpia la cookie y vuelve al
 * login con aviso. Con una sesión válida no cierra nada (evita forzar el
 * cierre con un enlace).
 */
export async function GET() {
  const s = await auth();
  if (s?.user) redirect("/ejecutivo");
  await signOut({ redirectTo: "/login?motivo=sesion" });
}
