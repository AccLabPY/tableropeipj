import { Prisma, type PrismaClient } from "@prisma/client";
import { prismaControl, type DbEnv } from "@/server/db/client";
import type { Ctx, CtxTx } from "@/server/db/env";
import { enTransaccion } from "@/server/db/tx";
import type { Actor } from "@/server/auth/guards";

/**
 * Bitácora de cambios administrativos (tabla AuditoriaAdmin, append-only).
 * Vive en la base de control; `env` registra sobre qué base se actuó.
 * - Cambios en producción: la auditoría va en la MISMA transacción que el
 *   cambio (si no se puede auditar, el cambio no se aplica).
 * - Cambios en la base de prueba: no hay transacción entre dos bases; se
 *   audita después del commit, con mejor esfuerzo.
 * Nunca se registran contraseñas ni binarios: los llamadores arman
 * `antes`/`despues` con los campos relevantes.
 */

export type AccionAuditoria =
  | "INDICADOR_ACTUALIZAR"
  | "INDICADOR_CREAR"
  | "INDICADOR_ELIMINAR"
  | "INDICADOR_DESACTIVAR"
  | "OE_CREAR"
  | "OE_ELIMINAR"
  | "AE_CREAR"
  | "AE_ELIMINAR"
  | "UMBRAL_GUARDAR"
  | "UMBRAL_ELIMINAR"
  | "USUARIO_CREAR"
  | "USUARIO_ACTUALIZAR"
  | "USUARIO_CERRAR_SESIONES"
  | "PLAZO_FIJAR"
  | "PRORROGA_OTORGAR"
  | "CARGA_HABILITAR"
  | "CARGA_CERRAR"
  | "PLAZO_GENERAL"
  | "PRESUPUESTO_GUARDAR"
  | "ENTORNO_CAMBIAR";

export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  INDICADOR_ACTUALIZAR: "Edición de indicador (matriz)",
  INDICADOR_CREAR: "Alta de indicador",
  INDICADOR_ELIMINAR: "Baja de indicador",
  INDICADOR_DESACTIVAR: "Desactivación de indicador",
  OE_CREAR: "Alta de objetivo",
  OE_ELIMINAR: "Baja de objetivo",
  AE_CREAR: "Alta de acción",
  AE_ELIMINAR: "Baja de acción",
  UMBRAL_GUARDAR: "Umbral del semáforo",
  UMBRAL_ELIMINAR: "Umbral restablecido a heredado",
  USUARIO_CREAR: "Alta de usuario",
  USUARIO_ACTUALIZAR: "Edición de usuario",
  USUARIO_CERRAR_SESIONES: "Cierre de sesiones de usuario",
  PLAZO_FIJAR: "Plazo de carga",
  PRORROGA_OTORGAR: "Prórroga de carga",
  CARGA_HABILITAR: "Habilitación de carga",
  CARGA_CERRAR: "Cierre de carga",
  PLAZO_GENERAL: "Plazo general del ejercicio",
  PRESUPUESTO_GUARDAR: "Ejecución presupuestaria",
  ENTORNO_CAMBIAR: "Cambio de entorno de datos",
};

export interface EventoAuditoria {
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | number | null;
  antes?: unknown;
  despues?: unknown;
  motivo?: string | null;
}

/** JSON serializable: BigInt como texto; Decimal y Date con su toJSON. */
function aJson(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (v === undefined || v === null) return Prisma.JsonNull;
  return JSON.parse(
    JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)),
  ) as Prisma.InputJsonValue;
}

export async function auditar(
  db: PrismaClient | Prisma.TransactionClient,
  actor: Actor,
  env: DbEnv,
  ev: EventoAuditoria,
): Promise<void> {
  await db.auditoriaAdmin.create({
    data: {
      usuarioId: actor.userId,
      usuarioEmail: actor.email,
      env,
      accion: ev.accion,
      entidad: ev.entidad,
      entidadId: ev.entidadId == null ? null : String(ev.entidadId),
      antes: aJson(ev.antes),
      despues: aJson(ev.despues),
      motivo: ev.motivo ?? null,
    },
  });
}

/** Ejecuta un cambio sobre la base activa y lo audita. */
export async function conAuditoria<T>(
  ctx: Ctx,
  fn: (tx: CtxTx) => Promise<{ valor: T; evento: EventoAuditoria }>,
): Promise<T> {
  if (ctx.env === "prod") {
    // Base activa = base de control: una sola transacción, atómica.
    return enTransaccion(ctx, async (tx) => {
      const r = await fn(tx);
      await auditar(tx.db, ctx.actor, ctx.env, r.evento);
      return r.valor;
    });
  }
  const r = await enTransaccion(ctx, fn);
  try {
    await auditar(prismaControl(), ctx.actor, ctx.env, r.evento);
  } catch (e) {
    console.error("[auditoria] no registrada (base de prueba):", e, r.evento);
  }
  return r.valor;
}

/** Ejecuta un cambio sobre la base de control (usuarios) y lo audita. */
export function conAuditoriaControl<T>(
  actor: Actor,
  env: DbEnv,
  fn: (db: Prisma.TransactionClient) => Promise<{ valor: T; evento: EventoAuditoria }>,
): Promise<T> {
  return prismaControl().$transaction(
    async (db) => {
      const r = await fn(db);
      await auditar(db, actor, env, r.evento);
      return r.valor;
    },
    { maxWait: 5_000, timeout: 10_000 },
  );
}

// ---------------------------------------------------------------- consulta

export interface FiltrosAuditoria {
  accion?: string;
  usuario?: string;
  entidad?: string;
  env?: "prod" | "test";
  /** yyyy-mm-dd, hora de Asunción. */
  desde?: string;
  hasta?: string;
  /** Cursor: id de la última fila de la página anterior. */
  antesDe?: string;
}

export interface FilaAuditoriaDTO {
  id: string;
  fecha: string;
  usuarioEmail: string;
  env: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  antes: unknown;
  despues: unknown;
  motivo: string | null;
}

/** Página de la bitácora (más reciente primero), leída de la base de control. */
export async function listarAuditoria(
  f: FiltrosAuditoria,
  porPagina: number,
): Promise<{ filas: FilaAuditoriaDTO[]; hayMas: boolean }> {
  const where: Prisma.AuditoriaAdminWhereInput = {
    ...(f.accion ? { accion: f.accion } : {}),
    ...(f.entidad ? { entidad: f.entidad } : {}),
    ...(f.env ? { env: f.env } : {}),
    ...(f.usuario ? { usuarioEmail: { contains: f.usuario.toLowerCase() } } : {}),
    ...(f.desde || f.hasta
      ? {
          fecha: {
            ...(f.desde ? { gte: new Date(`${f.desde}T00:00:00-03:00`) } : {}),
            ...(f.hasta ? { lte: new Date(`${f.hasta}T23:59:59-03:00`) } : {}),
          },
        }
      : {}),
    ...(f.antesDe ? { id: { lt: BigInt(f.antesDe) } } : {}),
  };
  const filas = await prismaControl().auditoriaAdmin.findMany({
    where,
    orderBy: { id: "desc" },
    take: porPagina + 1,
  });
  return {
    hayMas: filas.length > porPagina,
    filas: filas.slice(0, porPagina).map((r) => ({
      id: String(r.id),
      fecha: r.fecha.toISOString(),
      usuarioEmail: r.usuarioEmail,
      env: r.env,
      accion: r.accion,
      entidad: r.entidad,
      entidadId: r.entidadId,
      antes: r.antes,
      despues: r.despues,
      motivo: r.motivo,
    })),
  };
}
