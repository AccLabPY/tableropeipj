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
  AeCreateSchema,
  EstructuraDeleteSchema,
  IndicadorCreateSchema,
  IndicadorUpdateSchema,
  OeCreateSchema,
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

// --------------------------- Estructura del PEI -----------------------------
// El alta y baja de OE / AE / Indicadores es privativa del ADMIN: cambia la
// matriz estratégica sobre la que se calculan todos los tableros.

/** Alta de un objetivo estratégico. */
export async function crearOeAction(input: unknown): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = OeCreateSchema.parse(input);
    const existe = await ctx.db.objetivoEstrategico.findUnique({
      where: { codigo: d.codigo },
    });
    if (existe) {
      throw new ApiError(409, "OE_DUPLICADO", `El objetivo ${d.codigo} ya existe.`);
    }
    await ctx.db.objetivoEstrategico.create({
      data: { codigo: d.codigo, nombre: d.nombre },
    });
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Objetivo ${d.codigo} creado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Alta de una acción estratégica dentro de un objetivo. */
export async function crearAeAction(input: unknown): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = AeCreateSchema.parse(input);
    const [oe, existe] = await Promise.all([
      ctx.db.objetivoEstrategico.findUnique({ where: { codigo: d.oeCodigo } }),
      ctx.db.accionEstrategica.findUnique({ where: { codigo: d.codigo } }),
    ]);
    if (!oe) throw noEncontrado(`Objetivo ${d.oeCodigo}`);
    if (existe) {
      throw new ApiError(409, "AE_DUPLICADA", `La acción ${d.codigo} ya existe.`);
    }
    await ctx.db.accionEstrategica.create({
      data: { codigo: d.codigo, nombre: d.nombre, oeId: oe.id },
    });
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Acción ${d.codigo} creada en ${d.oeCodigo}.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Alta de un indicador con su dependencia principal y sus metas 2026–2030. */
export async function crearIndicadorAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = IndicadorCreateSchema.parse(input);
    const existe = await ctx.db.indicador.findUnique({ where: { codigo: d.codigo } });
    if (existe) {
      throw new ApiError(
        409,
        "INDICADOR_DUPLICADO",
        `Ya existe un indicador con el código ${d.codigo}.`,
      );
    }
    // El "padre" define el nivel: OE (indicador de objetivo) o AE.
    const esOE = /^OE\d/i.test(d.padre);
    const ae = esOE
      ? null
      : await ctx.db.accionEstrategica.findUnique({ where: { codigo: d.padre } });
    if (!esOE && !ae) throw noEncontrado(`Acción estratégica ${d.padre}`);
    const oe = esOE
      ? await ctx.db.objetivoEstrategico.findUnique({ where: { codigo: d.padre } })
      : await ctx.db.objetivoEstrategico.findUnique({ where: { id: ae!.oeId } });
    if (!oe) throw noEncontrado(`Objetivo ${d.padre}`);

    const creado = await ctx.db.indicador.create({
      data: {
        codigo: d.codigo,
        nivel: esOE ? "OE" : "AE",
        oeId: oe.id,
        aeId: ae?.id ?? null,
        nombre: d.nombre,
        formula: d.formula ?? null,
        variables: d.variables ?? null,
        unidad: d.unidad,
        sentido: d.sentido,
        lineaBase: d.lineaBase !== null ? D(d.lineaBase) : null,
        basePendiente: d.lineaBase === null,
        activo: true,
      },
    });
    await ctx.db.indicadorDependencia.create({
      data: {
        indicadorId: creado.id,
        dependenciaId: d.dependenciaId,
        rol: "PRINCIPAL",
      },
    });
    for (const m of d.metas) {
      await ctx.db.meta.create({
        data: {
          indicadorId: creado.id,
          anio: m.anio,
          valorMeta: m.valorMeta !== null ? D(m.valorMeta) : null,
        },
      });
    }
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Indicador ${d.codigo} creado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/**
 * Baja de una entidad de la estructura. Regla de integridad:
 *  - OE/AE solo se eliminan si no tienen hijos.
 *  - Un indicador con mediciones NO se borra (rompería la trazabilidad):
 *    se desactiva y deja de contar en los tableros.
 */
export async function eliminarEstructuraAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const ctx = await getCtx(actor);
    const d = EstructuraDeleteSchema.parse(input);

    if (d.tipo === "OE") {
      const oe = await ctx.db.objetivoEstrategico.findUnique({
        where: { codigo: d.codigo },
        include: { _count: { select: { acciones: true, indicadores: true } } },
      });
      if (!oe) throw noEncontrado(`Objetivo ${d.codigo}`);
      if (oe._count.acciones > 0 || oe._count.indicadores > 0) {
        throw new ApiError(
          409,
          "OE_CON_HIJOS",
          `No se puede eliminar ${d.codigo}: tiene ${oe._count.acciones} acciones y ${oe._count.indicadores} indicadores. Elimínelos primero.`,
        );
      }
      await ctx.db.oePnd.deleteMany({ where: { oeId: oe.id } });
      await ctx.db.oeOds.deleteMany({ where: { oeId: oe.id } });
      await ctx.db.objetivoEstrategico.delete({ where: { id: oe.id } });
      invalidarEstadoPEI();
      revalidatePath("/", "layout");
      return { ok: true, mensaje: `Objetivo ${d.codigo} eliminado.` };
    }

    if (d.tipo === "AE") {
      const ae = await ctx.db.accionEstrategica.findUnique({
        where: { codigo: d.codigo },
        include: { _count: { select: { indicadores: true } } },
      });
      if (!ae) throw noEncontrado(`Acción ${d.codigo}`);
      if (ae._count.indicadores > 0) {
        throw new ApiError(
          409,
          "AE_CON_INDICADORES",
          `No se puede eliminar ${d.codigo}: tiene ${ae._count.indicadores} indicadores asociados.`,
        );
      }
      await ctx.db.accionEstrategica.delete({ where: { id: ae.id } });
      invalidarEstadoPEI();
      revalidatePath("/", "layout");
      return { ok: true, mensaje: `Acción ${d.codigo} eliminada.` };
    }

    const codigo = Number(d.codigo);
    const ind = await ctx.db.indicador.findUnique({
      where: { codigo },
      include: { _count: { select: { mediciones: true } } },
    });
    if (!ind) throw noEncontrado(`Indicador ${d.codigo}`);
    if (ind._count.mediciones > 0) {
      await ctx.db.indicador.update({
        where: { id: ind.id },
        data: { activo: false },
      });
      invalidarEstadoPEI();
      revalidatePath("/", "layout");
      return {
        ok: true,
        mensaje: `El indicador ${codigo} tiene ${ind._count.mediciones} mediciones registradas: se desactivó (sale de los tableros) y su historial se conserva.`,
      };
    }
    await ctx.db.meta.deleteMany({ where: { indicadorId: ind.id } });
    await ctx.db.escalaIndicador.deleteMany({ where: { indicadorId: ind.id } });
    await ctx.db.indicadorDependencia.deleteMany({ where: { indicadorId: ind.id } });
    await ctx.db.indicador.delete({ where: { id: ind.id } });
    invalidarEstadoPEI();
    revalidatePath("/", "layout");
    return { ok: true, mensaje: `Indicador ${codigo} eliminado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}
