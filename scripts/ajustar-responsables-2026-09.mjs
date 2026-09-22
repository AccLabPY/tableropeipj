/**
 * Ajuste de responsables solicitado por la DGPD (septiembre 2026).
 *
 * Cambiar responsable PRINCIPAL:
 *   3401 → Dirección Técnico Forense
 *   3501 → Dirección General de Planificación y Desarrollo
 *   5    → Dirección General de Administración y Finanzas   (indicador de OE5)
 *   5404 → Dirección de Infraestructura Física
 *   6301 → Gerencia Superior del Registro Unificado Nacional
 * Agregar CORRESPONSABLE:
 *   6    → Gerencia Superior del Registro Unificado Nacional (indicador de OE6)
 *
 * Uso:  node scripts/ajustar-responsables-2026-09.mjs            (dry-run, prod)
 *       node scripts/ajustar-responsables-2026-09.mjs aplicar    (aplica, prod)
 *       node scripts/ajustar-responsables-2026-09.mjs aplicar test
 */
import { PrismaClient } from "@prisma/client";

const aplicar = process.argv.includes("aplicar");
const env = process.argv.includes("test") ? "test" : "prod";
const url = env === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
const db = new PrismaClient({ datasources: { db: { url } } });

const CAMBIOS_PRINCIPAL = [
  { codigo: 3401, dependencia: "Dirección Técnico Forense" },
  { codigo: 3501, dependencia: "Dirección General de Planificación y Desarrollo" },
  { codigo: 5, dependencia: "Dirección General de Administración y Finanzas" },
  { codigo: 5404, dependencia: "Dirección de Infraestructura Física" },
  { codigo: 6301, dependencia: "Gerencia Superior del Registro Unificado Nacional" },
];
const NUEVOS_CORRESPONSABLES = [
  { codigo: 6, dependencia: "Gerencia Superior del Registro Unificado Nacional" },
];

async function depPorNombre(nombre) {
  const exacta = await db.dependencia.findUnique({ where: { nombre } });
  if (exacta) return exacta;
  const parecidas = await db.dependencia.findMany({
    where: { nombre: { contains: nombre.split(" ").slice(-2).join(" ") } },
    select: { id: true, nombre: true },
  });
  return { faltante: nombre, parecidas };
}

let errores = 0;
console.log(`═══ ${env.toUpperCase()} · ${aplicar ? "APLICANDO" : "DRY-RUN (sin cambios)"} ═══`);

for (const c of [...CAMBIOS_PRINCIPAL, ...NUEVOS_CORRESPONSABLES]) {
  const esPrincipal = CAMBIOS_PRINCIPAL.includes(c);
  const ind = await db.indicador.findUnique({
    where: { codigo: c.codigo },
    include: { responsables: { include: { dependencia: true } } },
  });
  if (!ind) {
    console.log(`✗ Indicador ${c.codigo}: NO EXISTE`);
    errores++;
    continue;
  }
  const dep = await depPorNombre(c.dependencia);
  if (dep.faltante) {
    console.log(`✗ ${c.codigo}: dependencia "${c.dependencia}" no está en el catálogo.`);
    if (dep.parecidas.length) {
      for (const p of dep.parecidas) console.log(`    ¿quizás? [${p.id}] ${p.nombre}`);
    } else if (aplicar) {
      const creada = await db.dependencia.create({ data: { nombre: c.dependencia } });
      console.log(`    → creada como dependencia nueva [${creada.id}]`);
      dep.id = creada.id;
      dep.nombre = creada.nombre;
      delete dep.faltante;
    }
    if (dep.faltante) {
      errores++;
      continue;
    }
  }

  const principalActual = ind.responsables.find((r) => r.rol === "PRINCIPAL");
  console.log(`\n${c.codigo} · ${ind.nombre.slice(0, 70)}`);
  console.log(`   principal actual: ${principalActual?.dependencia.nombre ?? "—"}`);

  if (esPrincipal) {
    if (principalActual?.dependenciaId === dep.id) {
      console.log(`   = ya es el principal. Sin cambios.`);
      continue;
    }
    console.log(`   → nuevo principal: ${dep.nombre}`);
    if (aplicar) {
      if (principalActual) {
        await db.indicadorDependencia.delete({
          where: {
            indicadorId_dependenciaId_rol: {
              indicadorId: ind.id,
              dependenciaId: principalActual.dependenciaId,
              rol: "PRINCIPAL",
            },
          },
        });
      }
      // Si la nueva dependencia ya figura con otro rol, se conserva ese rol.
      await db.indicadorDependencia.upsert({
        where: {
          indicadorId_dependenciaId_rol: {
            indicadorId: ind.id,
            dependenciaId: dep.id,
            rol: "PRINCIPAL",
          },
        },
        create: { indicadorId: ind.id, dependenciaId: dep.id, rol: "PRINCIPAL" },
        update: {},
      });
      console.log(`   ✓ aplicado`);
    }
  } else {
    const yaEsta = ind.responsables.some(
      (r) => r.dependenciaId === dep.id && r.rol === "CORRESPONSABLE",
    );
    if (yaEsta) {
      console.log(`   = ya figura como corresponsable. Sin cambios.`);
      continue;
    }
    console.log(`   → agregar corresponsable: ${dep.nombre}`);
    if (aplicar) {
      await db.indicadorDependencia.create({
        data: { indicadorId: ind.id, dependenciaId: dep.id, rol: "CORRESPONSABLE" },
      });
      console.log(`   ✓ aplicado`);
    }
  }
}

console.log(
  errores
    ? `\n${errores} pendientes de resolver — nada de eso se aplicó.`
    : `\nListo (${aplicar ? "cambios aplicados" : "dry-run sin cambios"}).`,
);
await db.$disconnect();
process.exit(errores ? 1 : 0);
