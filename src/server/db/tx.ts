import { Prisma } from "@prisma/client";
import type { Ctx, CtxTx } from "./env";

/**
 * Ejecuta `fn` en una transacción interactiva. Mantenerla corta: sin lecturas
 * cacheadas ni I/O externo adentro (retiene una conexión del pool). Las
 * notificaciones, el SLA y la invalidación de cachés van DESPUÉS del commit:
 * capturan sus propios errores y, dentro de la transacción, un error capturado
 * la deja abortada en PostgreSQL.
 */
export function enTransaccion<T>(
  ctx: Ctx,
  fn: (tx: CtxTx) => Promise<T>,
  op: { timeoutMs?: number } = {},
): Promise<T> {
  return ctx.db.$transaction(
    (db) => fn({ db, actor: ctx.actor, env: ctx.env }),
    { maxWait: 5_000, timeout: op.timeoutMs ?? 10_000 },
  );
}

/** Violación de clave única (P2002): dos escrituras concurrentes chocaron. */
export function esViolacionUnica(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
