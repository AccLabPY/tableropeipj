/**
 * Agrega el Nivel 0 — "Preparativos" — a todos los indicadores de escala
 * que aún no lo tienen (pedido del PJ, 2026). Idempotente; correr en ambas
 * bases:  node scripts/agregar-nivel-cero.mjs        (producción)
 *         node scripts/agregar-nivel-cero.mjs test   (prueba)
 *
 * Convención: el % de un nivel es su cota superior (pctMax). El nivel 0 vale
 * 0%: todo avance por debajo de la cota del nivel 1 son preparativos.
 */
import { PrismaClient } from "@prisma/client";

const env = process.argv[2] === "test" ? "test" : "prod";
const url = env === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

const DESCRIPCION =
  "Preparativos: actividades previas al inicio de la planificación";

const inds = await db.indicador.findMany({
  where: { esEscala: true },
  select: { id: true, codigo: true, escala: { select: { nivel: true } } },
});

let agregados = 0;
for (const ind of inds) {
  if (ind.escala.some((e) => e.nivel === 0)) continue;
  await db.escalaIndicador.create({
    data: {
      indicadorId: ind.id,
      nivel: 0,
      descripcion: DESCRIPCION,
      pctMin: 0,
      pctMax: 0,
    },
  });
  agregados++;
}
console.log(
  `[${env}] ${inds.length} indicadores de escala · nivel 0 agregado a ${agregados} (${inds.length - agregados} ya lo tenían).`,
);
await db.$disconnect();
