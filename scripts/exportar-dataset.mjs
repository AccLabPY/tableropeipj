/**
 * Exporta la estructura del PEI desde la base al dataset del repositorio
 * (prisma/data/*.json). Desde el go-live la base de producción es la fuente
 * de verdad: este script mantiene el JSON como respaldo legible y versionado
 * (atributos editados en la Matriz, metas, escalas con el nivel 0,
 * responsables y altas o bajas de Estructura).
 *
 *   node scripts/exportar-dataset.mjs            → escribe los JSON
 *   node scripts/exportar-dataset.mjs --simular  → solo informa diferencias
 *
 * Lee DATABASE_URL (usar la base de producción). Solo lectura sobre la base.
 * Después: `npm run data:verify` y commitear los JSON.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const SIMULAR = process.argv.includes("--simular");
const DIR = join(process.cwd(), "prisma", "data");
const ANIOS_PEI = [2026, 2027, 2028, 2029, 2030];

// `docker run --env-file` conserva las comillas del archivo .env.
const url = (process.env.DATABASE_URL ?? "").replace(/^"|"$/g, "");
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}
const db = new PrismaClient({ datasourceUrl: url });

const leer = (archivo) => JSON.parse(readFileSync(join(DIR, archivo), "utf-8"));
const num = (d) => (d === null || d === undefined ? null : Number(d));
const numeroOE = (codigo) => Number(String(codigo).replace(/^OE/i, ""));

function escribir(archivo, datos) {
  const texto = JSON.stringify(datos, null, 2) + "\n";
  const previo = readFileSync(join(DIR, archivo), "utf-8");
  const cambia = texto !== previo;
  console.log(`${cambia ? "~" : "="} ${archivo}${cambia ? " (cambia)" : " (sin cambios)"}`);
  if (cambia && !SIMULAR) writeFileSync(join(DIR, archivo), texto, "utf-8");
}

/** Respeta el orden previo del JSON (los ids de un entorno nuevo dependen de él). */
function ordenarComo(previos, clave, nuevos) {
  const pos = new Map(previos.map((x, i) => [x[clave], i]));
  return [...nuevos].sort((a, b) => {
    const pa = pos.get(a[clave]);
    const pb = pos.get(b[clave]);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return String(a[clave]).localeCompare(String(b[clave]), "es", { numeric: true });
  });
}

async function main() {
  const [objetivosDb, accionesDb, indicadoresDb, riesgosDb] = await Promise.all([
    db.objetivoEstrategico.findMany({
      include: {
        pnd: { include: { pnd: true } },
        ods: { include: { ods: true } },
      },
      orderBy: { codigo: "asc" },
    }),
    db.accionEstrategica.findMany({ include: { oe: true }, orderBy: { id: "asc" } }),
    db.indicador.findMany({
      include: {
        oe: true,
        ae: true,
        metas: true,
        escala: { orderBy: { nivel: "asc" } },
        responsables: { include: { dependencia: true } },
      },
      orderBy: { codigo: "asc" },
    }),
    db.riesgo.findMany({ include: { oe: true }, orderBy: { id: "asc" } }),
  ]);

  // Objetivos
  const objetivosPrev = leer("objetivos.json");
  escribir(
    "objetivos.json",
    ordenarComo(
      objetivosPrev,
      "codigo",
      objetivosDb.map((o) => ({
        id: numeroOE(o.codigo),
        codigo: o.codigo,
        nombre: o.nombre,
        pnd: o.pnd.map((x) => x.pnd.codigo).sort(),
        ods: o.ods.map((x) => x.ods.numero).sort((a, b) => a - b),
      })),
    ),
  );

  // Acciones
  const accionesPrev = leer("acciones.json");
  escribir(
    "acciones.json",
    ordenarComo(
      accionesPrev,
      "codigo",
      accionesDb.map((a) => ({ codigo: a.codigo, oe: numeroOE(a.oe.codigo), nombre: a.nombre })),
    ),
  );

  // Indicadores (solo activos: un indicador desactivado sale de los tableros)
  const indicadoresPrev = leer("indicadores.json");
  const prevPorCodigo = new Map(indicadoresPrev.map((i) => [i.codigo, i]));
  const inactivos = indicadoresDb.filter((i) => !i.activo).map((i) => i.codigo);
  const conFuente = [];
  const indicadores = indicadoresDb
    .filter((i) => i.activo)
    .map((i) => {
      const prev = prevPorCodigo.get(i.codigo) ?? {};
      const principal = i.responsables.filter((r) => r.rol === "PRINCIPAL");
      const corresp = i.responsables.filter((r) => r.rol === "CORRESPONSABLE");
      if (i.responsables.some((r) => r.rol === "FUENTE")) conFuente.push(i.codigo);
      const metaDe = (anio) => num(i.metas.find((m) => m.anio === anio)?.valorMeta);
      const salida = {
        codigo: i.codigo,
        nivel: i.nivel,
        oe: numeroOE(i.oe.codigo),
        ae: i.ae?.codigo ?? null,
        nombre: i.nombre,
        descripcion: i.descripcion,
        variables: i.variables,
        formula: i.formula,
        dimension: i.dimension,
        ambito: i.ambito,
        unidad: i.unidad,
        sentido: i.sentido,
        lineaBase: num(i.lineaBase),
        anioLineaBase: i.anioLineaBase,
        ...(prev.lineaBaseNota ? { lineaBaseNota: prev.lineaBaseNota } : {}),
        metas: ANIOS_PEI.map(metaDe),
        dependencias: [...principal, ...corresp].map((r) => r.dependencia.nombre),
        ...(i.fuenteInfo ? { fuentes: i.fuenteInfo } : {}),
        comentarios: i.comentarios,
        escala: i.escala.length
          ? i.escala.map((e) => ({ nivel: e.nivel, descripcion: e.descripcion, pctMax: num(e.pctMax) }))
          : null,
      };
      return salida;
    });
  escribir("indicadores.json", ordenarComo(indicadoresPrev, "codigo", indicadores));

  // Riesgos
  escribir(
    "riesgos.json",
    riesgosDb.map((r) => ({
      oe: numeroOE(r.oe.codigo),
      descripcion: r.descripcion,
      probabilidad: r.probabilidad,
      impacto: r.impacto,
      evaluacion: r.evaluacion,
      mitigacion: r.mitigacion,
    })),
  );

  if (inactivos.length) {
    console.log(`\nIndicadores desactivados (no exportados): ${inactivos.join(", ")}`);
  }
  if (conFuente.length) {
    console.log(
      `Indicadores con dependencias FUENTE (el JSON no las representa): ${conFuente.join(", ")}`,
    );
  }
  console.log(SIMULAR ? "\nSimulación: no se escribió nada." : "\nListo. Siguiente paso: npm run data:verify");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
