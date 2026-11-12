"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { requireApi } from "@/server/auth/guards";
import { getCtx, getDbEnv } from "@/server/db/env";
import { esViolacionUnica } from "@/server/db/tx";
import { ApiError, noEncontrado } from "@/server/api/api-error";
import { invalidarVigencia } from "@/server/auth/vigencia";
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
import { invalidarStore } from "./cache";
import { conAuditoria, conAuditoriaControl } from "./auditoria.service";

export interface ResultadoAdmin {
  ok: boolean;
  mensaje: string;
}

const D = (n: number) => new Prisma.Decimal(n);

function msg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof ZodError) return e.errors.map((x) => x.message).join(" · ");
  if (esViolacionUnica(e)) {
    return "Ya existe un registro con esa clave. Si el alta no repite un código existente, las secuencias de la base pueden estar desalineadas (ver runbook).";
  }
  console.error("[admin] error:", e);
  return "Error inesperado.";
}

/** Después de un cambio que afecta los tableros. */
function refrescarTableros(): void {
  invalidarEstadoPEI();
  revalidatePath("/", "layout");
}

/** Atributos auditables de un indicador (sin relaciones). */
function fotoIndicador(i: {
  nombre: string;
  descripcion: string | null;
  formula: string | null;
  sentido: string;
  unidad: string;
  lineaBase: Prisma.Decimal | null;
  anioLineaBase: number | null;
  peso: Prisma.Decimal;
  activo: boolean;
}) {
  return {
    nombre: i.nombre,
    descripcion: i.descripcion,
    formula: i.formula,
    sentido: i.sentido,
    unidad: i.unidad,
    lineaBase: i.lineaBase,
    anioLineaBase: i.anioLineaBase,
    peso: i.peso,
    activo: i.activo,
  };
}

/** Actualiza atributos + metas de un indicador de la matriz (DGPD/ADMIN). */
export async function actualizarIndicadorAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = IndicadorUpdateSchema.parse(input);
    await conAuditoria(ctx, async (tx) => {
      const ind = await tx.db.indicador.findUnique({
        where: { codigo: d.codigo },
        include: { metas: { orderBy: { anio: "asc" } } },
      });
      if (!ind) throw noEncontrado(`Indicador ${d.codigo}`);
      const actualizado = await tx.db.indicador.update({
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
        await tx.db.meta.upsert({
          where: { indicadorId_anio: { indicadorId: ind.id, anio: m.anio } },
          update: { valorMeta: m.valorMeta === null ? null : D(m.valorMeta) },
          create: {
            indicadorId: ind.id,
            anio: m.anio,
            valorMeta: m.valorMeta === null ? null : D(m.valorMeta),
          },
        });
      }
      return {
        valor: undefined,
        evento: {
          accion: "INDICADOR_ACTUALIZAR",
          entidad: "Indicador",
          entidadId: d.codigo,
          antes: {
            ...fotoIndicador(ind),
            metas: ind.metas.map((m) => ({ anio: m.anio, valorMeta: m.valorMeta })),
          },
          despues: { ...fotoIndicador(actualizado), metas: d.metas },
        },
      };
    });
    refrescarTableros();
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
    await conAuditoria(ctx, async (tx) => {
      const clave = { scope: d.scope, entidad: d.entidad };
      const antes = await tx.db.umbralCriticidad.findUnique({
        where: { scope_entidad: clave },
      });
      await tx.db.umbralCriticidad.upsert({
        where: { scope_entidad: clave },
        update: { verde: d.verde, amarillo: d.amarillo },
        create: d,
      });
      return {
        valor: undefined,
        evento: {
          accion: "UMBRAL_GUARDAR",
          entidad: "UmbralCriticidad",
          entidadId: `${d.scope}:${d.entidad}`,
          antes: antes ? { verde: antes.verde, amarillo: antes.amarillo } : null,
          despues: { verde: d.verde, amarillo: d.amarillo },
        },
      };
    });
    refrescarTableros();
    return {
      ok: true,
      mensaje: "Escala guardada. Semáforos del tablero recalculados.",
    };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

const UmbralDeleteSchema = z.object({
  scope: z.enum(["GLOBAL", "OE", "AE", "INDICADOR"]),
  entidad: z.string().min(1).max(20),
});

/** Elimina un umbral específico (vuelve a heredar). El GLOBAL no se borra. */
export async function eliminarUmbralAction(
  scope: string,
  entidad: string,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN", "DGPD_VALIDADOR");
    const ctx = await getCtx(actor);
    const d = UmbralDeleteSchema.parse({ scope, entidad });
    if (d.scope === "GLOBAL") {
      throw new ApiError(422, "GLOBAL_REQUERIDO", "La escala global no puede eliminarse.");
    }
    await conAuditoria(ctx, async (tx) => {
      const antes = await tx.db.umbralCriticidad.findUnique({
        where: { scope_entidad: { scope: d.scope, entidad: d.entidad } },
      });
      await tx.db.umbralCriticidad.deleteMany({
        where: { scope: d.scope, entidad: d.entidad },
      });
      return {
        valor: undefined,
        evento: {
          accion: "UMBRAL_ELIMINAR",
          entidad: "UmbralCriticidad",
          entidadId: `${d.scope}:${d.entidad}`,
          antes: antes ? { verde: antes.verde, amarillo: antes.amarillo } : null,
          despues: null,
        },
      };
    });
    refrescarTableros();
    return { ok: true, mensaje: "Escala eliminada: vuelve a heredar." };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Datos auditables de un usuario (nunca el hash de la contraseña). */
function fotoUsuario(u: {
  nombre: string;
  email: string;
  activo: boolean;
  roles: { rol: string }[];
  dependencias: { dependenciaId: number }[];
}) {
  return {
    nombre: u.nombre,
    email: u.email,
    activo: u.activo,
    roles: u.roles.map((r) => r.rol).sort(),
    dependenciaIds: u.dependencias.map((x) => x.dependenciaId).sort((a, b) => a - b),
  };
}

/** Destinatarios de notificaciones y vigencia de sesión tras tocar usuarios. */
function refrescarPadron(usuarioId?: number): void {
  invalidarStore("notif-dest");
  invalidarVigencia(usuarioId);
  revalidatePath("/admin/usuarios");
}

/**
 * Alta de usuario. Los usuarios viven en el PLANO DE CONTROL (base de
 * producción) sin importar el modo de datos activo del admin.
 */
export async function crearUsuarioAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const d = UsuarioCreateSchema.parse(input);
    // Normalizado: el unique de email en PostgreSQL distingue mayúsculas.
    const email = d.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(d.password, 10);
    const u = await conAuditoriaControl(actor, await getDbEnv(), async (db) => {
      const existe = await db.usuario.findUnique({ where: { email } });
      if (existe) {
        throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe un usuario con ese correo.");
      }
      const creado = await db.usuario.create({
        data: {
          nombre: d.nombre,
          email,
          passwordHash,
          roles: { create: d.roles.map((rol) => ({ rol })) },
          dependencias: {
            create: d.dependenciaIds.map((dependenciaId) => ({ dependenciaId })),
          },
        },
        include: { roles: true, dependencias: true },
      });
      return {
        valor: creado,
        evento: {
          accion: "USUARIO_CREAR",
          entidad: "Usuario",
          entidadId: creado.id,
          antes: null,
          despues: fotoUsuario(creado),
        },
      };
    });
    refrescarPadron(u.id);
    return { ok: true, mensaje: `Usuario ${u.email} creado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/**
 * Edición de usuario: nombre, email, roles, dependencias, activo y reseteo de
 * contraseña. Desactivar o cambiar la contraseña cierra sus sesiones
 * abiertas; un cambio de roles o dependencias rige en su próximo request.
 */
export async function actualizarUsuarioAction(
  input: unknown,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const d = UsuarioUpdateSchema.parse(input);
    const email = d.email.trim().toLowerCase();
    if (d.id === actor.userId && !d.activo) {
      throw new ApiError(422, "AUTO_DESACTIVACION", "No puede desactivar su propio usuario.");
    }
    if (d.id === actor.userId && !d.roles.includes("ADMIN")) {
      throw new ApiError(
        422,
        "AUTO_QUITAR_ADMIN",
        "No puede quitarse a sí mismo el rol de Administrador: pídaselo a otro administrador.",
      );
    }
    const passwordHash = d.password ? await bcrypt.hash(d.password, 10) : null;

    const mensaje = await conAuditoriaControl(actor, await getDbEnv(), async (db) => {
      const antes = await db.usuario.findUnique({
        where: { id: d.id },
        include: { roles: true, dependencias: true },
      });
      if (!antes) throw noEncontrado("Usuario");

      const otro = await db.usuario.findUnique({ where: { email } });
      if (otro && otro.id !== d.id) {
        throw new ApiError(409, "EMAIL_DUPLICADO", "Ya existe otro usuario con ese correo.");
      }

      const eraAdminActivo = antes.activo && antes.roles.some((r) => r.rol === "ADMIN");
      const siguiendoAdminActivo = d.activo && d.roles.includes("ADMIN");
      if (eraAdminActivo && !siguiendoAdminActivo) {
        const otrosAdmins = await db.usuario.count({
          where: { id: { not: d.id }, activo: true, roles: { some: { rol: "ADMIN" } } },
        });
        if (otrosAdmins === 0) {
          throw new ApiError(
            422,
            "ULTIMO_ADMIN",
            "Es el único administrador activo: asigne el rol a otra persona antes de quitárselo o desactivarlo.",
          );
        }
      }

      const cierraSesiones = (antes.activo && !d.activo) || passwordHash !== null;
      await db.usuario.update({
        where: { id: d.id },
        data: {
          nombre: d.nombre,
          email,
          activo: d.activo,
          ...(passwordHash ? { passwordHash } : {}),
          ...(cierraSesiones ? { sesionVersion: { increment: 1 } } : {}),
        },
      });
      await db.usuarioRol.deleteMany({ where: { usuarioId: d.id } });
      await db.usuarioRol.createMany({
        data: d.roles.map((rol) => ({ usuarioId: d.id, rol })),
      });
      await db.usuarioDependencia.deleteMany({ where: { usuarioId: d.id } });
      await db.usuarioDependencia.createMany({
        data: d.dependenciaIds.map((dependenciaId) => ({ usuarioId: d.id, dependenciaId })),
      });
      return {
        valor: cierraSesiones
          ? "Usuario actualizado. Sus sesiones abiertas se cerraron."
          : "Usuario actualizado. Los cambios de permisos rigen de inmediato.",
        evento: {
          accion: "USUARIO_ACTUALIZAR",
          entidad: "Usuario",
          entidadId: d.id,
          antes: fotoUsuario(antes),
          despues: {
            nombre: d.nombre,
            email,
            activo: d.activo,
            roles: [...d.roles].sort(),
            dependenciaIds: [...d.dependenciaIds].sort((a, b) => a - b),
            passwordCambiada: passwordHash !== null,
          },
        },
      };
    });
    refrescarPadron(d.id);
    return { ok: true, mensaje };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/** Cierra todas las sesiones abiertas de un usuario (sin cambiar su cuenta). */
export async function cerrarSesionesUsuarioAction(
  usuarioId: number,
): Promise<ResultadoAdmin> {
  try {
    const actor = await requireApi("ADMIN");
    const id = z.coerce.number().int().positive().parse(usuarioId);
    await conAuditoriaControl(actor, await getDbEnv(), async (db) => {
      const u = await db.usuario.findUnique({ where: { id }, select: { email: true } });
      if (!u) throw noEncontrado("Usuario");
      await db.usuario.update({
        where: { id },
        data: { sesionVersion: { increment: 1 } },
      });
      return {
        valor: undefined,
        evento: {
          accion: "USUARIO_CERRAR_SESIONES",
          entidad: "Usuario",
          entidadId: id,
          despues: { email: u.email },
        },
      };
    });
    refrescarPadron(id);
    return {
      ok: true,
      mensaje:
        id === actor.userId
          ? "Sus sesiones se cerraron: ingrese nuevamente."
          : "Las sesiones del usuario se cerraron.",
    };
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
    await conAuditoria(ctx, async (tx) => {
      const existe = await tx.db.objetivoEstrategico.findUnique({
        where: { codigo: d.codigo },
      });
      if (existe) {
        throw new ApiError(409, "OE_DUPLICADO", `El objetivo ${d.codigo} ya existe.`);
      }
      await tx.db.objetivoEstrategico.create({
        data: { codigo: d.codigo, nombre: d.nombre },
      });
      return {
        valor: undefined,
        evento: {
          accion: "OE_CREAR",
          entidad: "ObjetivoEstrategico",
          entidadId: d.codigo,
          despues: { codigo: d.codigo, nombre: d.nombre },
        },
      };
    });
    refrescarTableros();
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
    await conAuditoria(ctx, async (tx) => {
      const oe = await tx.db.objetivoEstrategico.findUnique({
        where: { codigo: d.oeCodigo },
      });
      if (!oe) throw noEncontrado(`Objetivo ${d.oeCodigo}`);
      const existe = await tx.db.accionEstrategica.findUnique({
        where: { codigo: d.codigo },
      });
      if (existe) {
        throw new ApiError(409, "AE_DUPLICADA", `La acción ${d.codigo} ya existe.`);
      }
      await tx.db.accionEstrategica.create({
        data: { codigo: d.codigo, nombre: d.nombre, oeId: oe.id },
      });
      return {
        valor: undefined,
        evento: {
          accion: "AE_CREAR",
          entidad: "AccionEstrategica",
          entidadId: d.codigo,
          despues: { codigo: d.codigo, nombre: d.nombre, oe: d.oeCodigo },
        },
      };
    });
    refrescarTableros();
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
    await conAuditoria(ctx, async (tx) => {
      const existe = await tx.db.indicador.findUnique({ where: { codigo: d.codigo } });
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
        : await tx.db.accionEstrategica.findUnique({ where: { codigo: d.padre } });
      if (!esOE && !ae) throw noEncontrado(`Acción estratégica ${d.padre}`);
      const oe = esOE
        ? await tx.db.objetivoEstrategico.findUnique({ where: { codigo: d.padre } })
        : await tx.db.objetivoEstrategico.findUnique({ where: { id: ae!.oeId } });
      if (!oe) throw noEncontrado(`Objetivo ${d.padre}`);

      const creado = await tx.db.indicador.create({
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
      await tx.db.indicadorDependencia.create({
        data: {
          indicadorId: creado.id,
          dependenciaId: d.dependenciaId,
          rol: "PRINCIPAL",
        },
      });
      await tx.db.meta.createMany({
        data: d.metas.map((m) => ({
          indicadorId: creado.id,
          anio: m.anio,
          valorMeta: m.valorMeta !== null ? D(m.valorMeta) : null,
        })),
      });
      return {
        valor: undefined,
        evento: {
          accion: "INDICADOR_CREAR",
          entidad: "Indicador",
          entidadId: d.codigo,
          despues: {
            nombre: d.nombre,
            padre: d.padre,
            unidad: d.unidad,
            sentido: d.sentido,
            formula: d.formula ?? null,
            lineaBase: d.lineaBase,
            dependenciaPrincipalId: d.dependenciaId,
            metas: d.metas,
          },
        },
      };
    });
    refrescarTableros();
    return { ok: true, mensaje: `Indicador ${d.codigo} creado.` };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}

/**
 * Baja de una entidad de la estructura. Regla de integridad:
 *  - OE solo se elimina sin acciones, indicadores ni riesgos; AE sin indicadores.
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

    const mensaje = await conAuditoria(ctx, async (tx) => {
      if (d.tipo === "OE") {
        const oe = await tx.db.objetivoEstrategico.findUnique({
          where: { codigo: d.codigo },
          include: {
            _count: { select: { acciones: true, indicadores: true, riesgos: true } },
          },
        });
        if (!oe) throw noEncontrado(`Objetivo ${d.codigo}`);
        if (oe._count.acciones > 0 || oe._count.indicadores > 0) {
          throw new ApiError(
            409,
            "OE_CON_HIJOS",
            `No se puede eliminar ${d.codigo}: tiene ${oe._count.acciones} acciones y ${oe._count.indicadores} indicadores. Elimínelos primero.`,
          );
        }
        if (oe._count.riesgos > 0) {
          throw new ApiError(
            409,
            "OE_CON_RIESGOS",
            `No se puede eliminar ${d.codigo}: tiene ${oe._count.riesgos} riesgos estratégicos asociados.`,
          );
        }
        await tx.db.oePnd.deleteMany({ where: { oeId: oe.id } });
        await tx.db.oeOds.deleteMany({ where: { oeId: oe.id } });
        await tx.db.objetivoEstrategico.delete({ where: { id: oe.id } });
        return {
          valor: `Objetivo ${d.codigo} eliminado.`,
          evento: {
            accion: "OE_ELIMINAR",
            entidad: "ObjetivoEstrategico",
            entidadId: d.codigo,
            antes: { codigo: oe.codigo, nombre: oe.nombre },
          },
        };
      }

      if (d.tipo === "AE") {
        const ae = await tx.db.accionEstrategica.findUnique({
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
        await tx.db.accionEstrategica.delete({ where: { id: ae.id } });
        return {
          valor: `Acción ${d.codigo} eliminada.`,
          evento: {
            accion: "AE_ELIMINAR",
            entidad: "AccionEstrategica",
            entidadId: d.codigo,
            antes: { codigo: ae.codigo, nombre: ae.nombre },
          },
        };
      }

      const codigo = Number(d.codigo);
      const ind = await tx.db.indicador.findUnique({
        where: { codigo },
        include: { _count: { select: { mediciones: true } } },
      });
      if (!ind) throw noEncontrado(`Indicador ${d.codigo}`);
      if (ind._count.mediciones > 0) {
        await tx.db.indicador.update({
          where: { id: ind.id },
          data: { activo: false },
        });
        return {
          valor: `El indicador ${codigo} tiene ${ind._count.mediciones} mediciones registradas: se desactivó (sale de los tableros) y su historial se conserva.`,
          evento: {
            accion: "INDICADOR_DESACTIVAR",
            entidad: "Indicador",
            entidadId: codigo,
            antes: { activo: ind.activo },
            despues: { activo: false },
          },
        };
      }
      await tx.db.meta.deleteMany({ where: { indicadorId: ind.id } });
      await tx.db.escalaIndicador.deleteMany({ where: { indicadorId: ind.id } });
      await tx.db.indicadorDependencia.deleteMany({ where: { indicadorId: ind.id } });
      await tx.db.indicador.delete({ where: { id: ind.id } });
      return {
        valor: `Indicador ${codigo} eliminado.`,
        evento: {
          accion: "INDICADOR_ELIMINAR",
          entidad: "Indicador",
          entidadId: codigo,
          antes: fotoIndicador(ind),
        },
      };
    });
    refrescarTableros();
    return { ok: true, mensaje };
  } catch (e) {
    return { ok: false, mensaje: msg(e) };
  }
}
