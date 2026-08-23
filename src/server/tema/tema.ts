import { cookies } from "next/headers";
import { auth } from "@/server/auth/auth";
import { esTema, TEMA_DEFAULT, type Tema } from "@/shared/tema";

export const COOKIE_TEMA = "pei-tema";

/**
 * Tema visual activo del request. Precedencia:
 *   1. cookie `pei-tema` (refleja el último cambio, incluso anónimo)
 *   2. tema persistido en la cuenta (viaja en el JWT desde el login)
 *   3. default de la plataforma (Agentes PEI)
 * Se decide SIEMPRE en el servidor (<html data-theme>): sin parpadeo ni
 * desajuste de hidratación.
 */
export async function getTema(): Promise<Tema> {
  const v = cookies().get(COOKIE_TEMA)?.value; // Next 14: cookies() es sync
  if (esTema(v)) return v;
  const session = await auth();
  const deCuenta = session?.user?.tema;
  if (esTema(deCuenta)) return deCuenta;
  return TEMA_DEFAULT;
}
