/**
 * Migración de datos TiDB (MySQL) → PostgreSQL 17 on-premise (Fase B).
 *
 * Corre en pnud-app (contenedor node:20) o en cualquier host con acceso
 * simultáneo a TiDB:4000 y a pnud-db:5432. Usa drivers crudos (mysql2 + pg):
 * el cliente Prisma del repo ya está generado para PostgreSQL y solo se usa
 * su DMMF como mapa de tipos y relaciones.
 *
 * Uso:
 *   node scripts/migrar-a-postgres.mjs --db prod --paso preflight
 *   node scripts/migrar-a-postgres.mjs --db test --paso all      (preflight+carga+secuencias+validar)
 *
 * Variables (p.ej. vía dotenv -e .env.migracion):
 *   TIDB_DATABASE_URL / TIDB_DATABASE_URL_TEST   mysql://...
 *   PG_DATABASE_URL   / PG_DATABASE_URL_TEST     postgresql://peipj_migrator:...
 *
 * Re-ejecutable: la carga hace TRUNCATE ... CASCADE de todas las tablas.
 * Los IDs se preservan tal cual; al final se resetean las secuencias.
 */
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import pg from "pg";
import { Prisma } from "@prisma/client";

// ------------------------------- CLI ----------------------------------------
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const DB = arg("db", "test") === "prod" ? "prod" : "test";
const PASO = arg("paso", "all");
const LOTE = 300; // filas por INSERT multi-fila (límite pg: 65535 parámetros)

const tidbUrl = process.env[DB === "prod" ? "TIDB_DATABASE_URL" : "TIDB_DATABASE_URL_TEST"];
const pgUrl = process.env[DB === "prod" ? "PG_DATABASE_URL" : "PG_DATABASE_URL_TEST"];
if (!tidbUrl || !pgUrl) {
  console.error("Faltan TIDB_DATABASE_URL(_TEST) / PG_DATABASE_URL(_TEST).");
  process.exit(1);
}

// ------------------------ Orden topológico de carga --------------------------
// DAG de las FKs nativas; dentro de cada fase el orden es libre. Las tablas
// sin FKs nativas van al final (sus referencias a Usuario son sueltas por
// diseño: el padrón vive en la base de control).
const ORDEN = [
  "ObjetivoEstrategico",
  "AccionEstrategica",
  "Indicador",
  "Meta",
  "EscalaIndicador",
  "Dependencia",
  "Periodo",
  "Circunscripcion",
  "Usuario",
  "IndicadorDependencia",
  "UsuarioRol",
  "UsuarioDependencia",
  "Medicion",
  "Validacion",
  "Evidencia",
  "HistorialEstado",
  "PndPilar",
  "PndObjetivo",
  "OePnd",
  "Ods",
  "OeOds",
  "Riesgo",
  "LoteEtl",
  "ErrorEtl",
  "Parametro",
  "UmbralCriticidad",
  "Notificacion",
  "VentanaCarga",
  "SlaCarga",
  "PresupuestoEjercicio",
];

// --------------------- Mapa de tipos desde el DMMF ---------------------------
const modelos = Object.fromEntries(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
const faltan = ORDEN.filter((t) => !modelos[t]);
const sobran = Object.keys(modelos).filter((t) => !ORDEN.includes(t));
if (faltan.length || sobran.length) {
  console.error("ORDEN desincronizado con el schema:", { faltan, sobran });
  process.exit(1);
}

/** Columnas escalares/enum de un modelo (sin campos de relación). */
function columnasDe(tabla) {
  return modelos[tabla].fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
}
/** Con secuencia = id escalar con @default(autoincrement()). */
function tieneSecuencia(tabla) {
  return columnasDe(tabla).some((f) => f.isId && f.default?.name === "autoincrement");
}
/** Convierte un valor de mysql2 al bind correcto para pg según el tipo Prisma. */
function convertir(campo, v) {
  if (v === null || v === undefined) return null;
  switch (campo.type) {
    case "Boolean":
      return Number(v) !== 0; // TINYINT(1) → bool (pg no castea int→bool)
    case "Json":
      return typeof v === "string" ? v : JSON.stringify(v); // se castea ::jsonb
    default:
      return v; // BigInt/Decimal/DateTime como string; Bytes como Buffer
  }
}

// ------------------------------ Conexiones ----------------------------------
async function abrirMysql() {
  const u = new URL(tidbUrl);
  const con = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { minVersion: "TLSv1.2" }, // TiDB Serverless exige TLS
    supportBigNumbers: true,
    bigNumberStrings: true, // BigInt ids llegan como string (sin corromper >2^53)
    dateStrings: true, // DATETIME(3) llega literal 'YYYY-MM-DD HH:MM:SS.mmm'
  });
  await con.query("SET SESSION time_zone = '+00:00'");
  await con.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
  return con;
}
async function abrirPg() {
  const cli = new pg.Client({ connectionString: pgUrl });
  await cli.connect();
  await cli.query("SET TIME ZONE 'UTC'");
  return cli;
}

// ------------------------------- Pre-flight ----------------------------------
async function preflight(my) {
  let errores = 0;
  console.log(`\n── PRE-FLIGHT [${DB}] ──`);

  // (a) Huérfanos en cada relación que pasa a FK nativa (derivadas del DMMF).
  for (const m of Prisma.dmmf.datamodel.models) {
    for (const f of m.fields) {
      if (f.kind !== "object" || !f.relationFromFields?.length) continue;
      const col = f.relationFromFields[0];
      const ref = f.relationToFields[0];
      const [rows] = await my.query(
        `SELECT COUNT(*) AS n FROM \`${m.name}\` h LEFT JOIN \`${f.type}\` p ON h.\`${col}\` = p.\`${ref}\` WHERE h.\`${col}\` IS NOT NULL AND p.\`${ref}\` IS NULL`,
      );
      const n = Number(rows[0].n);
      if (n > 0) {
        console.log(`✗ ${m.name}.${col} → ${f.type}: ${n} huérfano(s)`);
        errores++;
      }
    }
  }

  // (b) Emails que colisionarían al normalizar a minúsculas.
  const [dups] = await my.query(
    "SELECT LOWER(email) AS e, COUNT(*) AS n FROM `Usuario` GROUP BY LOWER(email) HAVING COUNT(*) > 1",
  );
  for (const d of dups) {
    console.log(`✗ Email duplicado tras lower(): ${d.e} (${d.n} filas)`);
    errores++;
  }

  console.log(errores ? `${errores} problema(s): corregir en TiDB antes de cargar.` : "✓ Sin huérfanos ni duplicados.");
  return errores;
}

// --------------------------------- Carga ------------------------------------
async function carga(my, pgc) {
  console.log(`\n── CARGA [${DB}] ──`);
  const lista = ORDEN.map((t) => `"${t}"`).join(", ");
  await pgc.query(`TRUNCATE ${lista} CASCADE`);

  for (const tabla of ORDEN) {
    const campos = columnasDe(tabla);
    const nombres = campos.map((c) => `"${c.name}"`).join(", ");
    const misel = campos.map((c) => `\`${c.name}\``).join(", ");
    const esEvidencia = tabla === "Evidencia";

    // Evidencia: el binario se trae fila por fila (blobs de hasta 25MB).
    const sel = esEvidencia
      ? campos.filter((c) => c.name !== "contenido").map((c) => `\`${c.name}\``).join(", ")
      : misel;
    const [filas] = await my.query(`SELECT ${sel} FROM \`${tabla}\``);

    let insertadas = 0;
    // Evidencia va fila por fila: 300 blobs de hasta 25MB no entran en memoria.
    const lote = esEvidencia ? 1 : LOTE;
    for (let i = 0; i < filas.length; i += lote) {
      const bloque = filas.slice(i, i + lote);
      const valores = [];
      const params = [];
      let p = 1;
      for (const fila of bloque) {
        if (esEvidencia) {
          const [[bin]] = await my.query("SELECT `contenido` FROM `Evidencia` WHERE `id` = ?", [fila.id]);
          fila.contenido = bin.contenido;
        }
        if (tabla === "Usuario" && fila.email) fila.email = String(fila.email).trim().toLowerCase();
        const marcas = campos.map((c) => {
          params.push(convertir(c, fila[c.name]));
          return c.type === "Json" ? `$${p++}::jsonb` : `$${p++}`;
        });
        valores.push(`(${marcas.join(",")})`);
      }
      await pgc.query(`INSERT INTO "${tabla}" (${nombres}) VALUES ${valores.join(",")}`, params);
      insertadas += bloque.length;
    }
    console.log(`  ${tabla.padEnd(22)} ${insertadas} filas`);
  }
}

// ------------------------------- Secuencias ----------------------------------
async function secuencias(pgc) {
  console.log(`\n── SECUENCIAS [${DB}] ──`);
  for (const tabla of ORDEN) {
    if (!tieneSecuencia(tabla)) continue;
    const r = await pgc.query(
      `SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM "${tabla}"), 1), 1), (SELECT MAX(id) IS NOT NULL FROM "${tabla}")) AS v`,
      [`"${tabla}"`],
    );
    console.log(`  ${tabla.padEnd(22)} setval → ${r.rows[0].v}`);
  }
}

// -------------------------------- Validar ------------------------------------
async function validar(my, pgc) {
  console.log(`\n── VALIDACIÓN [${DB}] ──`);
  let difs = 0;
  const cmp = (etq, a, b) => {
    const ok = String(a ?? "∅") === String(b ?? "∅");
    if (!ok) {
      console.log(`  ✗ ${etq}: TiDB=${a} PG=${b}`);
      difs++;
    }
    return ok;
  };

  for (const tabla of ORDEN) {
    const [[mrow]] = await my.query(`SELECT COUNT(*) AS n FROM \`${tabla}\``);
    const prow = await pgc.query(`SELECT COUNT(*)::text AS n FROM "${tabla}"`);
    cmp(`${tabla} count`, mrow.n, prow.rows[0].n);
    if (tieneSecuencia(tabla)) {
      const [[mm]] = await my.query(`SELECT MAX(id) AS m FROM \`${tabla}\``);
      const pm = await pgc.query(`SELECT MAX(id)::text AS m FROM "${tabla}"`);
      cmp(`${tabla} max(id)`, mm.m, pm.rows[0].m);
    }
  }

  // Decimales agregados (comparados como texto, sin float).
  for (const [tabla, col] of [
    ["Medicion", "valorObservado"],
    ["Medicion", "numerador"],
    ["PresupuestoEjercicio", "asignado"],
    ["PresupuestoEjercicio", "ejecutado"],
  ]) {
    const [[mrow]] = await my.query(`SELECT CAST(COALESCE(SUM(\`${col}\`),0) AS CHAR) AS s FROM \`${tabla}\``);
    const prow = await pgc.query(`SELECT COALESCE(SUM("${col}"),0)::text AS s FROM "${tabla}"`);
    cmp(`Σ ${tabla}.${col}`, Number(mrow.s).toFixed(4), Number(prow.rows[0].s).toFixed(4));
  }

  // Evidencias: tamaño total y verificación de SHA-256 en una muestra.
  const [[mev]] = await my.query(
    "SELECT COALESCE(SUM(`tamanioBytes`),0) AS t, COALESCE(SUM(`contenido` IS NOT NULL),0) AS c FROM `Evidencia`",
  );
  const pev = await pgc.query(
    'SELECT COALESCE(SUM("tamanioBytes"),0)::text AS t, COUNT("contenido")::text AS c FROM "Evidencia"',
  );
  cmp("Σ Evidencia.tamanioBytes", mev.t, pev.rows[0].t);
  cmp("Evidencia con binario", mev.c ?? 0, pev.rows[0].c);

  const muestra = await pgc.query(
    'SELECT id, "hashSha256", contenido FROM "Evidencia" WHERE contenido IS NOT NULL ORDER BY random() LIMIT 20',
  );
  for (const ev of muestra.rows) {
    const h = createHash("sha256").update(ev.contenido).digest("hex");
    if (ev.hashSha256 && h !== ev.hashSha256) {
      console.log(`  ✗ Evidencia ${ev.id}: sha256 no coincide (${h} ≠ ${ev.hashSha256})`);
      difs++;
    }
  }
  console.log(
    difs
      ? `✗ ${difs} diferencia(s): NO usar esta base.`
      : `✓ Todo coincide (muestra sha256: ${muestra.rows.length} evidencias).`,
  );
  return difs;
}

// --------------------------------- Main --------------------------------------
const my = await abrirMysql();
const pgc = await abrirPg();
let fallo = 0;
try {
  if (PASO === "preflight" || PASO === "all") fallo += await preflight(my);
  if (fallo === 0 && (PASO === "carga" || PASO === "all")) await carga(my, pgc);
  if (fallo === 0 && (PASO === "secuencias" || PASO === "carga" || PASO === "all")) await secuencias(pgc);
  if (fallo === 0 && (PASO === "validar" || PASO === "all")) fallo += await validar(my, pgc);
} finally {
  await my.end().catch(() => {});
  await pgc.end().catch(() => {});
}
process.exit(fallo ? 1 : 0);
