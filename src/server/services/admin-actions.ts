"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx } from "@/server/db/env";
import { prismaControl } from "@/server/db/client";
import { ApiError, noEncontrado } from "@/server/api/api-error";
import {
  IndicadorUpdateSchema,
  UmbralUpsertSchema,
  UsuarioCreateSchema,
  UsuarioUpdateSchema,
} from "@/shared/schemas/admin";
import { invalidarEstadoPEI } from "./estado-cache";

export interface ResultadoAdmin {
  ok: boolean;
  mensaje: string;
}

const D = (n: number) => new Prisma.Decimal(n);

function msg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof ZodError) return e.errors.map((x) => x.message).join(" · ");
  console.error("[admin] error:", e);
  return "Error inesperado.";
}

/** Actualiza atributos + metas de un indicador de la matriz (DGPD/ADMIN). */
export async function actualizarIndicadorAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = IndicadorUpdateSchema.parse(input);
    const ind = await ctx.db.indicador.findUnique({
      where: { codigo: d.codigo },
    });
    if (!ind) throw noEncontrado(`Indicador ${d.codigo}`);
    await ctx.db.indicador.update({
      where: { codigo: d.codigo },
      data: {
        nombre: d.nombre,
        descripcion: d.descripcion ?? null,
        formula: d.formula ?? null,
        sentido: d.sentido,
        unidad: d.unidad,
        lineaBase: d.lineaBase === null ? null : D(d.lineaBase),
        anioLineaBase: d.anioLineaBase,
        basePendiente: d.lineaBase === null,
        peso: D(d.peso),
        activo: d.activo,
      },
    });
    for (const m of d.metas) {
      await ctx.db.meta.upsert({
        where: { indicadorId_anio: { indicadorId: ind.id, anio: m.anio } },
        update: { valorMeta: m.valorMeta === null ? null : D(m.valorMeta) },
        create: {
          indicadorId: ind.id,
          anio: m.anio,
          valorMeta: m.valorMeta === null ? null : D(m.valorMeta),
        },
      });
    }
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Indicador ${d.codigo} actualizado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Crea/actualiza un umbral de criticidad; recalcula los semáforos al vuelo. */
export async function guardarUmbralAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = UmbralUpsertSchema.parse(input);
    await ctx.db.umbralCriticidad.upsert({
      where: { scope_entidad: { scope: d.scope, entidad: d.entidad } },
      update: { verde: d.verde, amarillo: d.amarillo },
      create: d,
    });
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return {
      ok: true,
      mensaje: "Escala guardada. Semáforos del tablero recalculados.",
    };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Elimina un umbral específico (vuelve a heredar). El GLOBAL no se borra. */
export async function eliminarUmbralAction(
  scope: string,
  entidad: string,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    if (scope === "GLOBAL") {
      throw new ApiError(422, "GLOBAL_REQUERIDO", "La escala global no puede eliminarse.");
    }
    await ctx.db.umbralCriticidad.deleteMany({
      where: { scope: scope as never, entidad },
    });
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Escala eliminada: vuelve a heredar." };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/**
 * Alta de usuario. Los usuarios viven en el PLANO DE CONTROL (base de
 * producción) sin importar el modo de datos activo del admin.
 */
export async function crearUsuarioAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    await requireApi("ADMIN");
    const d = UsuarioCreateSchema.parse(input);
    const db = prismaControl();
    const existe = await db.usuario.findUnique({ where: { email: d.email } });
    if (existe) {
      throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese correo.");
    }
    const u = await db.usuario.create({
      data: {
        nombre: d.nombre,
        email: d.email,
        passwordHash: await bcrypt.hash(d.password, 10),
        roles: { create: d.roles.map((rol) => ({ rol })) },
        dependencias: {
          create: d.dependenciaIds.map((dependenciaId) => ({ dependenciaId })),
        },
      },
    });
    revalidatePath("/admin/usuarios");
    return { ok: true, mensaje: `Usuario ${u.email} creado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Edición de usuario: nombre, roles, dependencias, activo, reset de clave. */
export async function actualizarUsuarioAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const d = UsuarioUpdateSchema.parse(input);
    const db = prismaControl();
    if (d.id === actor.userId && !d.activo) {
      throw new ApiError(422, "AUTO_DESACTIVACION", "No puede desactivar su propio usuario.");
    }
    await db.usuario.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        email: d.email,
        activo: d.activo,
        ...(d.password ? { passwordHash: await bcrypt.hash(d.password, 10) } : {}),
      },
    });
    await db.usuarioRol.deleteMany({ where: { usuarioId: d.id } });
    for (const rol of d.roles) {
      await db.usuarioRol.create({ data: { usuarioId: d.id, rol } });
    }
    await db.usuarioDependencia.deleteMany({ where: { usuarioId: d.id } });
    for (const dependenciaId of d.dependenciaIds) {
      await db.usuarioDependencia.create({
        data: { usuarioId: d.id, dependenciaId },
      });
    }
    revalidatePath("/admin/usuarios");
    return { ok: true, mensaje: "Usuario actualizado." };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}
