import type { TipoNotif } from "@prisma/client";
import type { Ctx } from "@/server/db/env";
import { prismaControl } from "@/server/db/client";
import type { EstadoWF } from "@/domain/types";
import { calcularCumplimiento, resolverUmbral, semaforo as clasificar } from "@/domain";
import type { MedicionCompleta } from "@/server/repositories/medicion.repo";
import { conTTL, TTL_LARGO } from "./cache";
import { catalogoIndicadores, umbralesCached } from "./estado-pei.service";
import { num } from "./mappers";
import type { NotificacionDTO } from "@/shared/dtos/notificaciones";

/**
 * Notificaciones in-app (campanita). Reglas:
 * - Toda transición de la máquina de estados produce notificaciones:
 *   dirección carga→validación notifica a DGPD/ADMIN; dirección
 *   validación→dependencia notifica a los usuarios de la dependencia dueña.
 * - Al APROBAR, si el indicador queda en semáforo ROJO se emite además
 *   INDICADOR_CRITICO a validadores + dependencia responsable.
 * - El emisor nunca se notifica a sí mismo.
 * - Fire-and-forget: un fallo aquí JAMÁS rompe la transición (try/catch en
 *   los puntos de enganche de medicion.service).
 * - La tabla vive en la BD de datos activa (prod/test); los destinatarios se
 *   resuelven contra el padrón de control (prismaControl), cuyos IDs son la
 *   identidad real de la sesión.
 */

// ---------------------------------------------------------------- destinatarios

function usuariosValidacion(): Promise<number[]> {
  return conTTL("notif-dest", "validadores", TTL_LARGO, true, async () => {
    const filas = await prismaControl().usuario.findMany({
      where: {
        activo: true,
        roles: { some: { rol: { in: ["DGPD_VALIDADOR", "ADMIN"] } } },
      },
      select: { id: true },
    });
    return filas.map((f) => f.id);
  });
}

function usuariosDeDependencia(dependenciaId: number): Promise<number[]> {
  return conTTL("notif-dest", `dep:${dependenciaId}`, TTL_LARGO, true, async () => {
    const filas = await prismaControl().usuario.findMany({
      where: {
        activo: true,
        dependencias: { some: { dependenciaId } },
      },
      select: { id: true },
    });
    return filas.map((f) => f.id);
  });
}

// ---------------------------------------------------------------- emisión

const HACIA_TIPO: Partial<Record<EstadoWF, TipoNotif>> = {
  ENVIADO: "CARGA_ENVIADA",
  EN_REVISION: "CARGA_EN_REVISION",
  APROBADO: "CARGA_APROBADA",
  OBSERVADO: "CARGA_OBSERVADA",
  RECHAZADO: "CARGA_RECHAZADA",
  RECTIFICADO: "CARGA_RECTIFICADA",
};

const HACIA_TITULO: Partial<Record<EstadoWF, string>> = {
  ENVIADO: "Nueva carga enviada a validación",
  EN_REVISION: "Su carga fue tomada en revisión",
  APROBADO: "Su carga fue aprobada",
  OBSERVADO: "Su carga fue observada — requiere corrección",
  RECHAZADO: "Su carga fue rechazada",
  RECTIFICADO: "Su medición aprobada fue rectificada",
};

/** Estados que notifican hacia la DGPD (los produce la dependencia). */
const HACIA_VALIDADORES: EstadoWF[] = ["ENVIADO"];

async function crearPara(
  ctx: Ctx,
  destinatarios: number[],
  datos: {
    tipo: TipoNotif;
    medicionId?: bigint | null;
    indicadorId?: number | null;
    titulo: string;
    cuerpo?: string | null;
    url: string;
  },
): Promise<void> {
  const unicos = [...new Set(destinatarios)].filter(
    (id) => id !== ctx.actor.userId,
  );
  if (unicos.length === 0) return;
  await ctx.db.notificacion.createMany({
    data: unicos.map((usuarioId) => ({
      usuarioId,
      tipo: datos.tipo,
      medicionId: datos.medicionId ?? null,
      indicadorId: datos.indicadorId ?? null,
      titulo: datos.titulo,
      cuerpo: datos.cuerpo ?? null,
      url: datos.url,
    })),
  });
}

/**
 * Notifica una transición de estado de la máquina del workflow.
 * `m` es la medición YA transicionada (o la previa; solo usa ids/dependencia).
 */
export async function notificarTransicion(
  ctx: Ctx,
  m: MedicionCompleta,
  hacia: EstadoWF,
  comentario?: string | null,
): Promise<void> {
  const tipo = HACIA_TIPO[hacia];
  if (!tipo) return; // BORRADOR: privado de la dependencia, no notifica

  const inds = await catalogoIndicadores(ctx);
  const ind = inds.find((i) => i.id === m.indicadorId);
  const etiqueta = ind
    ? `Indicador ${ind.codigo} — ${ind.nombre}`
    : `Medición #${m.id}`;
  const contexto = `${etiqueta} · ejercicio ${m.periodo.anio} · v${m.version} · ${m.dependencia.nombre}`;

  const destinatarios = HACIA_VALIDADORES.includes(hacia)
    ? await usuariosValidacion()
    : await usuariosDeDependencia(m.dependenciaId);

  await crearPara(ctx, destinatarios, {
    tipo,
    medicionId: m.id,
    indicadorId: m.indicadorId,
    titulo: HACIA_TITULO[hacia]!,
    cuerpo: comentario ? `${contexto}\n“${comentario}”` : contexto,
    url: `/registro/carga/${m.id}`,
  });
}

/**
 * Tras una APROBACIÓN: si el cumplimiento del indicador queda en ROJO según
 * los umbrales vigentes, alerta a validadores/admin y a la dependencia.
 */
export async function notificarCriticoSiCorresponde(
  ctx: Ctx,
  m: MedicionCompleta,
): Promise<void> {
  const [inds, umbrales] = await Promise.all([
    catalogoIndicadores(ctx),
    umbralesCached(ctx),
  ]);
  const ind = inds.find((i) => i.id === m.indicadorId);
  if (!ind) return;

  const metaAnio = ind.metas.find((x) => x.anio === m.periodo.anio);
  const r = calcularCumplimiento({
    base: num(ind.lineaBase),
    meta: num(metaAnio?.valorMeta as never),
    valor: num(m.valorObservado as never),
    sentido: ind.sentido,
    metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
  });
  const umbral = resolverUmbral(umbrales, {
    indicadorCodigo: ind.codigo,
    aeCodigo: ind.ae?.codigo ?? null,
    oeCodigo: ind.oe.codigo,
  });
  if (clasificar(r.capado, umbral) !== "ROJO") return;

  const pct = r.capado === null ? "—" : `${Math.round(r.capado * 100)}%`;
  const [validadores, dependencia] = await Promise.all([
    usuariosValidacion(),
    usuariosDeDependencia(m.dependenciaId),
  ]);
  await crearPara(ctx, [...validadores, ...dependencia], {
    tipo: "INDICADOR_CRITICO",
    medicionId: m.id,
    indicadorId: m.indicadorId,
    titulo: `Indicador ${ind.codigo} en estado crítico`,
    cuerpo: `${ind.nombre} · cumplimiento ${pct} en ${m.periodo.anio}, por debajo del umbral (${Math.round(umbral.amarillo * 100)}%).`,
    url: `/indicadores/${ind.codigo}?anio=${m.periodo.anio}`,
  });
}

// ---------------------------------------------------------------- bandeja

function aDTO(n: {
  id: bigint;
  tipo: TipoNotif;
  titulo: string;
  cuerpo: string | null;
  url: string;
  leidaEn: Date | null;
  creadaEn: Date;
}): NotificacionDTO {
  return {
    id: String(n.id),
    tipo: n.tipo,
    titulo: n.titulo,
    cuerpo: n.cuerpo,
    url: n.url,
    leida: n.leidaEn !== null,
    creadaEn: n.creadaEn.toISOString(),
  };
}

export async function listarNotificaciones(
  ctx: Ctx,
  limite = 15,
): Promise<{ items: NotificacionDTO[]; noLeidas: number }> {
  const [filas, noLeidas] = await Promise.all([
    ctx.db.notificacion.findMany({
      where: { usuarioId: ctx.actor.userId },
      orderBy: { creadaEn: "desc" },
      take: limite,
    }),
    ctx.db.notificacion.count({
      where: { usuarioId: ctx.actor.userId, leidaEn: null },
    }),
  ]);
  return { items: filas.map(aDTO), noLeidas };
}

export async function marcarLeida(ctx: Ctx, id: bigint): Promise<void> {
  await ctx.db.notificacion.updateMany({
    where: { id, usuarioId: ctx.actor.userId, leidaEn: null },
    data: { leidaEn: new Date() },
  });
}

export async function marcarTodasLeidas(ctx: Ctx): Promise<void> {
  await ctx.db.notificacion.updateMany({
    where: { usuarioId: ctx.actor.userId, leidaEn: null },
    data: { leidaEn: new Date() },
  });
}
