/**
 * Repara los nombres de evidencias guardados con mojibake (bytes UTF-8
 * decodificados como Latin-1: "aceptaciÃ³n" → "aceptación"). Idempotente.
 * Correr en ambas bases:
 *   node scripts/reparar-nombres-evidencias.mjs        (producción)
 *   node scripts/reparar-nombres-evidencias.mjs test   (prueba)
 */
import { PrismaClient } from "@prisma/client";

const env = process.argv[2] === "test" ? "test" : "prod";
const url = env === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

function reparar(nombre) {
  // \"\u00C3\"/\"\u00C2\" seguidos de un byte de continuación UTF-8.
  if (!/[\u00C3\u00C2][\u0080-\u00BF]/.test(nombre)) return nombre;
  const reparado = Buffer.from(nombre, "latin1").toString("utf8");
  return reparado.includes("�") ? nombre : reparado;
}

const filas = await db.evidencia.findMany({
  select: { id: true, nombreArchivo: true },
});
let arregladas = 0;
for (const f of filas) {
  const nuevo = reparar(f.nombreArchivo);
  if (nuevo === f.nombreArchivo) continue;
  await db.evidencia.update({
    where: { id: f.id },
    data: { nombreArchivo: nuevo },
  });
  console.log(`  ${f.nombreArchivo}  →  ${nuevo}`);
  arregladas++;
}
console.log(`[${env}] ${filas.length} evidencias revisadas · ${arregladas} nombres reparados.`);
await db.$disconnect();
