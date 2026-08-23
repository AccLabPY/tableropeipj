/**
 * Seed de notificaciones de demostración (SOLO BD de prueba peipj_test).
 * Deriva notificaciones coherentes del HistorialEstado real existente:
 *  - hacia validadores/admin: cargas ENVIADAS (no leídas) + histórico leído
 *  - hacia cargadores de la dependencia: resoluciones (aprobada/observada/
 *    rechazada/rectificada) con el comentario real del validador
 *  - INDICADOR_CRITICO para indicadores hoy en ROJO
 * Uso:  node scripts/seed-notificaciones.mjs   (con .env cargado)
 */
import { PrismaClient } from "@prisma/client";

const urlTest = process.env.DATABASE_URL_TEST;
if (!urlTest || !urlTest.includes("test")) {
  console.error("DATABASE_URL_TEST no apunta a la base de prueba. Abortado.");
  process.exit(1);
}
const db = new PrismaClient({ datasources: { db: { url: urlTest } } });

// Padrón de control (usuarios reales de la sesión) — base prod.
const control = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const HACIA_TIPO = {
  ENVIADO: "CARGA_ENVIADA",
  EN_REVISION: "CARGA_EN_REVISION",
  APROBADO: "CARGA_APROBADA",
  OBSERVADO: "CARGA_OBSERVADA",
  RECHAZADO: "CARGA_RECHAZADA",
  RECTIFICADO: "CARGA_RECTIFICADA",
};
const HACIA_TITULO = {
  ENVIADO: "Nueva carga enviada a validación",
  EN_REVISION: "Su carga fue tomada en revisión",
  APROBADO: "Su carga fue aprobada",
  OBSERVADO: "Su carga fue observada — requiere corrección",
  RECHAZADO: "Su carga fue rechazada",
  RECTIFICADO: "Su medición aprobada fue rectificada",
};

const [validadores, porDependencia] = await Promise.all([
  control.usuario
    .findMany({
      where: {
        activo: true,
        roles: { some: { rol: { in: ["DGPD_VALIDADOR", "ADMIN"] } } },
      },
      select: { id: true },
    })
    .then((f) => f.map((x) => x.id)),
  control.usuarioDependencia.findMany({
    select: { usuarioId: true, dependenciaId: true },
  }),
]);
const usuariosDeDep = (depId) =>
  porDependencia.filter((x) => x.dependenciaId === depId).map((x) => x.usuarioId);

const historial = await db.historialEstado.findMany({
  orderBy: { fecha: "asc" },
  include: {
    medicion: {
      include: {
        indicador: { select: { codigo: true, nombre: true } },
        periodo: { select: { anio: true } },
        dependencia: { select: { nombre: true } },
      },
    },
  },
});

await db.notificacion.deleteMany({}); // seed idempotente

const filas = [];
const ahora = Date.now();
let eventos = 0;
for (const h of historial) {
  const tipo = HACIA_TIPO[h.estadoNuevo];
  if (!tipo) continue; // BORRADOR no notifica
  const m = h.medicion;
  const contexto = `Indicador ${m.indicador.codigo} — ${m.indicador.nombre} · ejercicio ${m.periodo.anio} · v${m.version} · ${m.dependencia.nombre}`;
  const cuerpo = h.comentario ? `${contexto}\n“${h.comentario}”` : contexto;
  const destinatarios =
    h.estadoNuevo === "ENVIADO" ? validadores : usuariosDeDep(m.dependenciaId);
  // Antigüedad → leída si el evento tiene más de 10 días (mezcla realista)
  const leida = ahora - h.fecha.getTime() > 10 * 24 * 3600e3;
  for (const usuarioId of destinatarios) {
    if (usuarioId === h.usuarioId) continue; // el emisor no se auto-notifica
    filas.push({
      usuarioId,
      tipo,
      medicionId: m.id,
      indicadorId: m.indicadorId,
      titulo: HACIA_TITULO[h.estadoNuevo],
      cuerpo,
      url: `/registro/carga/${m.id}`,
      creadaEn: h.fecha,
      leidaEn: leida ? new Date(h.fecha.getTime() + 3600e3) : null,
    });
  }
  eventos++;
}

// Cargas actualmente ENVIADAS: no-leídas frescas para validadores/admin
const enviadas = await db.medicion.findMany({
  where: { estado: "ENVIADO" },
  include: {
    indicador: { select: { codigo: true, nombre: true } },
    periodo: { select: { anio: true } },
    dependencia: { select: { nombre: true } },
  },
});
for (const [ix, m] of enviadas.entries()) {
  for (const usuarioId of validadores) {
    filas.push({
      usuarioId,
      tipo: "CARGA_ENVIADA",
      medicionId: m.id,
      indicadorId: m.indicadorId,
      titulo: "Nueva carga enviada a validación",
      cuerpo: `Indicador ${m.indicador.codigo} — ${m.indicador.nombre} · ejercicio ${m.periodo.anio} · v${m.version} · ${m.dependencia.nombre}`,
      url: `/registro/carga/${m.id}`,
      creadaEn: new Date(ahora - (ix + 2) * 3600e3),
      leidaEn: null,
    });
  }
}

// Indicadores hoy críticos (aprobados bajo umbral) según el tablero
const CRITICOS = [
  { codigo: 1301, pct: "60%" },
  { codigo: 6301, pct: "0%" },
];
for (const [ix, c] of CRITICOS.entries()) {
  const ind = await db.indicador.findUnique({
    where: { codigo: c.codigo },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      responsables: { select: { dependenciaId: true, rol: true } },
    },
  });
  if (!ind) continue;
  const principal = ind.responsables.find((r) => r.rol === "PRINCIPAL");
  const dest = [
    ...validadores,
    ...(principal ? usuariosDeDep(principal.dependenciaId) : []),
  ];
  for (const usuarioId of new Set(dest)) {
    filas.push({
      usuarioId,
      tipo: "INDICADOR_CRITICO",
      medicionId: null,
      indicadorId: ind.id,
      titulo: `Indicador ${ind.codigo} en estado crítico`,
      cuerpo: `${ind.nombre} · cumplimiento ${c.pct} en 2026, por debajo del umbral (70%).`,
      url: `/indicadores/${ind.codigo}?anio=2026`,
      creadaEn: new Date(ahora - (ix + 1) * 26 * 3600e3),
      leidaEn: ix === 1 ? new Date(ahora - 20 * 3600e3) : null,
    });
  }
}

const r = await db.notificacion.createMany({ data: filas });
const noLeidas = filas.filter((f) => !f.leidaEn).length;
console.log(
  `Sembradas ${r.count} notificaciones (${noLeidas} no leídas) sobre ${eventos} eventos de historial.`,
);
await db.$disconnect();
await control.$disconnect();
