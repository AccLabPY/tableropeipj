/**
 * data:actualizar — Ingestión de la data actualizada de fichas de indicadores
 * (prisma/data/actualizacion.csv, 83 indicadores de nivel AE).
 *
 *   npx tsx prisma/data/actualizar.ts                → FASE A: solo reporte
 *   npx tsx prisma/data/actualizar.ts --aplicar      → FASE B: aplica cambios
 *   … --aplicar --excluir 1401.lineaBase,1501.unidad → aplica excepto esos
 *
 * Política: ADICION y TEXTO/ESCALA se aplican; CONFLICTO se aplica salvo
 * exclusión explícita; VACIO_EN_FUENTE siempre conserva el valor actual.
 * La Fase A NUNCA modifica indicadores.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cargarIndicadores, type IndicadorJson, type EscalaJson } from "./load";

const DATA_DIR = join(process.cwd(), "prisma", "data");
const ARCHIVO = join(DATA_DIR, "actualizacion.csv");
const REPORTE = join(DATA_DIR, "reporte-diferencias.md");

const APLICAR = process.argv.includes("--aplicar");
const EXCLUIR = new Set(
  (process.argv[process.argv.indexOf("--excluir") + 1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => process.argv.includes("--excluir") && s.length > 0),
);

// ---------------------------------------------------------------------------
// Parser CSV (comillas, "" escapadas, saltos de línea dentro de celdas, BOM)
// ---------------------------------------------------------------------------
function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let enComillas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (enComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celda += '"';
          i++;
        } else enComillas = false;
      } else celda += c;
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ",") {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      celda = "";
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
    } else celda += c;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  }
  return filas;
}

// ---------------------------------------------------------------------------
// Normalizaciones
// ---------------------------------------------------------------------------
/** Limpia una celda: tabs colgantes por línea, espacios repetidos en bordes. */
const celda = (s: string | undefined): string =>
  (s ?? "")
    .split("\n")
    .map((l) => l.replace(/[\t ]+$/g, "").replace(/^[\t ]+/g, ""))
    .join("\n")
    .replace(/^"+|"+$/g, "")
    .trim();

/** Colapsa TODO el whitespace (para comparaciones de texto sin ruido). */
const plano = (s: string | null): string =>
  (s ?? "").replace(/\s+/g, " ").trim();

const numero = (s: string): number | null => {
  const t = s.replace(/\./g, (m, i, str) =>
    // punto de miles solo si sigue un grupo de 3 dígitos (272.543)
    /^\d{3}(\D|$)/.test(str.slice(i + 1)) ? "" : m,
  );
  const n = Number(t.replace(",", ".").replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
};

function normUnidad(s: string): string | null {
  const t = plano(s).toLowerCase();
  if (!t) return null;
  if (t.startsWith("porcent")) return "PORCENTAJE";
  if (t.startsWith("punt")) return "PUNTAJE";
  if (t.startsWith("índ") || t.startsWith("ind")) return "INDICE";
  if (t.startsWith("núm") || t.startsWith("num") || t.includes("metros"))
    return "NUMERO";
  return null;
}
const normSentido = (s: string): string | null =>
  /desc/i.test(s) ? "DESC" : /asc/i.test(s) ? "ASC" : null;

interface LineaBaseNueva {
  anio: number | null;
  valor: number | null;
  nota: string | null;
  interpretada: boolean;
}
function normLineaBase(s: string): LineaBaseNueva {
  const t = plano(s);
  if (!t) return { anio: null, valor: null, nota: null, interpretada: false };
  if (/determinar/i.test(t))
    return { anio: null, valor: null, nota: t, interpretada: false };
  // Corrupción Excel "2027:05:00" → "2027: 5"
  const excel = t.match(/^(\d{4}):0?(\d+):00$/);
  if (excel)
    return {
      anio: Number(excel[1]),
      valor: Number(excel[2]),
      nota: null,
      interpretada: true,
    };
  // Corrupción Excel mm:ss.d — "44:02.8" era "2024: 2.8" (año irrecuperable:
  // se conserva el año actual del dataset)
  const excelMs = t.match(/^\d{1,2}:0?(\d+(?:\.\d+)?)$/);
  if (excelMs)
    return {
      anio: null,
      valor: Number(excelMs[1]),
      nota: null,
      interpretada: true,
    };
  const m = t.match(/^(\d{4})\s*:\s*(.+)$/);
  if (m)
    return {
      anio: Number(m[1]),
      valor: numero(m[2]),
      nota: null,
      interpretada: false,
    };
  return { anio: null, valor: numero(t), nota: null, interpretada: false };
}

function normMetas(s: string): (number | null)[] | null {
  const map = new Map<number, number | null>();
  for (const linea of s.split("\n")) {
    const m = linea.trim().match(/^(\d{4})\s*:\s*(.+)$/);
    if (m) map.set(Number(m[1]), numero(m[2]));
  }
  const anios = [2026, 2027, 2028, 2029, 2030];
  if (!anios.every((a) => map.has(a))) return null;
  return anios.map((a) => map.get(a)!);
}

/** "* Fuente A\n* Fuente B" → "Fuente A | Fuente B" (formato del dataset). */
function normFuentes(s: string): string | null {
  const partes = s
    .split("\n")
    .map((l) => l.replace(/^\s*[*•-]\s*/, "").trim())
    .filter(Boolean);
  return partes.length ? partes.join(" | ") : null;
}

/** Mapa de normalización de nombres de dependencias al catálogo canónico. */
const DEP_NORMALIZACION: Record<string, string> = {
  "direccion asuntos juridicos": "Dirección de Asuntos Jurídicos",
  "direccion de asuntos juridicos": "Dirección de Asuntos Jurídicos",
  "direccion general de auditoria de gestion jurisdiccional":
    "Dirección General de Auditoría de Gestión Jurisdiccional",
  "direccion de estadistica judicial": "Dirección de Estadísticas Judiciales",
};
const sinAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function normDependencias(
  s: string,
  catalogo: Set<string>,
): { deps: string[]; desconocidas: string[] } {
  const porClave = new Map<string, string>();
  for (const nombre of catalogo) porClave.set(sinAcentos(nombre), nombre);
  const deps: string[] = [];
  const desconocidas: string[] = [];
  for (const parte of s.replace(/\n/g, " ").split(",")) {
    const nombre = parte.replace(/\s+/g, " ").trim();
    if (!nombre) continue;
    const clave = sinAcentos(nombre);
    const canonico =
      porClave.get(clave) ?? DEP_NORMALIZACION[clave] ?? null;
    if (canonico) {
      if (!deps.includes(canonico)) deps.push(canonico);
    } else desconocidas.push(nombre);
  }
  return { deps, desconocidas };
}

/** Extrae la escala de niveles del comentario ("N- Nivel …: desc. X%"). */
function normEscala(comentario: string): EscalaJson[] | null {
  const niveles: EscalaJson[] = [];
  for (const lineaRaw of comentario.split("\n")) {
    const linea = lineaRaw.trim();
    const m = linea.match(/^(\d)\s*[-–.]\s*(.+)$/);
    if (!m) continue;
    const nivel = Number(m[1]);
    const resto = m[2];
    // último porcentaje o rango de la línea → pctMax
    const pcts = [...resto.matchAll(/(\d{1,3})\s*(?:%|\s*-\s*(\d{1,3})\s*%)/g)];
    const rangos = [...resto.matchAll(/(\d{1,3})\s*%?\s*[-–]\s*(\d{1,3})\s*%/g)];
    let pctMax: number | null = null;
    if (rangos.length) pctMax = Number(rangos[rangos.length - 1][2]);
    else if (pcts.length) pctMax = Number(pcts[pcts.length - 1][1]);
    if (pctMax === null || pctMax < 1 || pctMax > 100) continue;
    const descripcion = plano(
      resto
        .replace(/\(?\d{1,3}\s*%?\s*[-–]\s*\d{1,3}\s*%\)?\s*$/g, "")
        .replace(/\d{1,3}\s*%\s*$/g, "")
        .replace(/[.:]\s*$/, ""),
    );
    if (nivel >= 1 && nivel <= 9) niveles.push({ nivel, descripcion, pctMax });
  }
  // válida solo si es creciente y con ≥2 niveles
  if (niveles.length < 2) return null;
  const orden = [...niveles].sort((a, b) => a.nivel - b.nivel);
  for (let i = 1; i < orden.length; i++) {
    if (orden[i].pctMax <= orden[i - 1].pctMax) return null;
  }
  return orden;
}

// ---------------------------------------------------------------------------
// Comparación
// ---------------------------------------------------------------------------
type Categoria = "ADICION" | "TEXTO" | "ESCALA" | "CONFLICTO" | "VACIO_EN_FUENTE";
interface Diferencia {
  codigo: number;
  campo: string;
  actual: string;
  nuevo: string;
  categoria: Categoria;
  nota?: string;
}

function main() {
  const csv = parseCsv(readFileSync(ARCHIVO, "utf-8"));
  const filas = csv.slice(1);
  const indicadores = cargarIndicadores();
  const porCodigo = new Map(indicadores.map((i) => [i.codigo, i]));
  const catalogoDeps = new Set(indicadores.flatMap((i) => i.dependencias));

  const difs: Diferencia[] = [];
  const desconocidasGlobal = new Set<string>();
  const codigosVistos = new Set<number>();
  /** Cambios a aplicar por código (mutaciones sobre el JSON). */
  const cambios = new Map<number, Partial<IndicadorJson> & { lineaBaseNota?: string }>();

  const add = (d: Diferencia) => difs.push(d);
  const claveExcl = (codigo: number, campo: string) => `${codigo}.${campo}`;
  const registrar = (
    codigo: number,
    campo: keyof IndicadorJson | "lineaBase.anio",
    valor: unknown,
  ) => {
    const c = cambios.get(codigo) ?? {};
    if (campo === "lineaBase.anio") {
      (c as Record<string, unknown>).anioLineaBase = valor;
    } else {
      (c as Record<string, unknown>)[campo] = valor;
    }
    cambios.set(codigo, c);
  };

  for (const fila of filas) {
    const codigo = parseInt(celda(fila[3]), 10);
    const ind = porCodigo.get(codigo);
    if (!ind || Number.isNaN(codigo)) {
      console.warn(`  ! fila con código no reconocido: ${celda(fila[3])}`);
      continue;
    }
    codigosVistos.add(codigo);
    const excl = (campo: string) => EXCLUIR.has(claveExcl(codigo, campo));

    // --- fuentes -----------------------------------------------------------
    const fuentesNueva = normFuentes(celda(fila[15]));
    if (fuentesNueva && plano(fuentesNueva) !== plano(ind.fuentes ?? null)) {
      add({
        codigo,
        campo: "fuentes",
        actual: ind.fuentes ?? "∅",
        nuevo: fuentesNueva,
        categoria: ind.fuentes ? "TEXTO" : "ADICION",
      });
      if (!excl("fuentes")) registrar(codigo, "fuentes", fuentesNueva);
    }

    // --- descripción -------------------------------------------------------
    const descNueva = plano(celda(fila[6])) || null;
    if (descNueva && plano(ind.descripcion) !== descNueva) {
      add({
        codigo,
        campo: "descripcion",
        actual: ind.descripcion ?? "∅",
        nuevo: descNueva,
        categoria: ind.descripcion ? "TEXTO" : "ADICION",
      });
      if (!excl("descripcion")) registrar(codigo, "descripcion", descNueva);
    }

    // --- variables ---------------------------------------------------------
    const varsNueva = celda(fila[7]).replace(/\n+/g, " | ").replace(/\s+/g, " ").trim() || null;
    if (varsNueva && plano(varsNueva) !== plano(ind.variables)) {
      add({
        codigo,
        campo: "variables",
        actual: ind.variables ?? "∅",
        nuevo: varsNueva,
        categoria: ind.variables ? "TEXTO" : "ADICION",
      });
      if (!excl("variables")) registrar(codigo, "variables", varsNueva);
    }

    // --- fórmula (afecta el tipo de cálculo) -------------------------------
    const formulaNueva = plano(celda(fila[8])) || null;
    const normF = (f: string | null) => (f ?? "").replace(/\s+/g, "");
    if (formulaNueva && normF(formulaNueva) !== normF(ind.formula)) {
      add({
        codigo,
        campo: "formula",
        actual: ind.formula ?? "∅",
        nuevo: formulaNueva,
        categoria: "CONFLICTO",
        nota: "cambia el tipo de cálculo automático",
      });
      if (!excl("formula")) registrar(codigo, "formula", formulaNueva);
    }

    // --- dimensión / unidad / sentido --------------------------------------
    const dimNueva = plano(celda(fila[4])) || null;
    if (!dimNueva && ind.dimension) {
      add({
        codigo, campo: "dimension", actual: ind.dimension, nuevo: "∅",
        categoria: "VACIO_EN_FUENTE", nota: "se conserva el valor actual",
      });
    } else if (dimNueva && dimNueva !== ind.dimension) {
      add({
        codigo, campo: "dimension", actual: ind.dimension ?? "∅",
        nuevo: dimNueva, categoria: "CONFLICTO",
      });
      if (!excl("dimension")) registrar(codigo, "dimension", dimNueva);
    }

    const uniNueva = normUnidad(celda(fila[9]));
    if (uniNueva && uniNueva !== ind.unidad) {
      add({
        codigo, campo: "unidad", actual: ind.unidad, nuevo: uniNueva,
        categoria: "CONFLICTO", nota: "afecta formato y formulario de carga",
      });
      if (!excl("unidad")) registrar(codigo, "unidad", uniNueva as IndicadorJson["unidad"]);
    }

    const senNuevo = normSentido(celda(fila[12]));
    if (senNuevo && senNuevo !== ind.sentido) {
      add({
        codigo, campo: "sentido", actual: ind.sentido, nuevo: senNuevo,
        categoria: "CONFLICTO", nota: "INVIERTE el cálculo de cumplimiento",
      });
      if (!excl("sentido")) registrar(codigo, "sentido", senNuevo as IndicadorJson["sentido"]);
    }

    // --- línea base --------------------------------------------------------
    const lb = normLineaBase(celda(fila[13]));
    const lbActualTxt =
      ind.lineaBase === null
        ? `a determinar (${ind.anioLineaBase ?? "?"})`
        : `${ind.lineaBase} (${ind.anioLineaBase ?? "?"})`;
    const lbNuevaTxt =
      lb.nota !== null
        ? lb.nota
        : `${lb.valor ?? "?"} (${lb.anio ?? "?"})${lb.interpretada ? " [INTERPRETADA de corrupción Excel]" : ""}`;
    const lbDifiere =
      lb.nota !== null
        ? ind.lineaBase !== null
        : lb.valor !== ind.lineaBase || (lb.anio !== null && lb.anio !== ind.anioLineaBase);
    if ((lb.valor !== null || lb.nota !== null) && lbDifiere) {
      add({
        codigo, campo: "lineaBase", actual: lbActualTxt, nuevo: lbNuevaTxt,
        categoria: "CONFLICTO", nota: "cambia la normalización del cumplimiento",
      });
      if (!excl("lineaBase")) {
        registrar(codigo, "lineaBase", lb.nota !== null ? null : lb.valor);
        if (lb.anio !== null) registrar(codigo, "lineaBase.anio", lb.anio);
        if (lb.nota !== null) registrar(codigo, "lineaBaseNota" as never, lb.nota);
      }
    }

    // --- metas -------------------------------------------------------------
    const metasNuevas = normMetas(celda(fila[14]));
    if (metasNuevas) {
      const difiere = metasNuevas.some((m, i) => m !== ind.metas[i]);
      if (difiere) {
        add({
          codigo, campo: "metas",
          actual: JSON.stringify(ind.metas),
          nuevo: JSON.stringify(metasNuevas),
          categoria: "CONFLICTO", nota: "cambia las metas anuales",
        });
        if (!excl("metas")) registrar(codigo, "metas", metasNuevas);
      }
    }

    // --- dependencias ------------------------------------------------------
    const depCell = celda(fila[16]);
    if (!depCell && ind.dependencias.length) {
      add({
        codigo, campo: "dependencias", actual: ind.dependencias.join(", "),
        nuevo: "∅", categoria: "VACIO_EN_FUENTE", nota: "se conservan las actuales",
      });
    } else if (depCell) {
      const { deps, desconocidas } = normDependencias(depCell, catalogoDeps);
      desconocidas.forEach((d) => desconocidasGlobal.add(`${codigo}: ${d}`));
      if (deps.length && JSON.stringify(deps) !== JSON.stringify(ind.dependencias)) {
        const mismoSet =
          JSON.stringify([...deps].sort()) ===
          JSON.stringify([...ind.dependencias].sort());
        const cat: Categoria =
          mismoSet && deps[0] === ind.dependencias[0] ? "TEXTO" : "CONFLICTO";
        add({
          codigo, campo: "dependencias",
          actual: ind.dependencias.join(", "), nuevo: deps.join(", "),
          categoria: cat,
          nota: cat === "CONFLICTO" ? "cambia responsable principal o el conjunto" : "solo orden de corresponsables",
        });
        if (!excl("dependencias")) registrar(codigo, "dependencias", deps);
      }
    }

    // --- comentarios + escala ----------------------------------------------
    const comNuevo = celda(fila[17]);
    const comPlano = plano(comNuevo);
    if (comPlano && comPlano.toLowerCase() !== "ninguno" && comPlano !== plano(ind.comentarios)) {
      add({
        codigo, campo: "comentarios", actual: (ind.comentarios ?? "∅").slice(0, 120),
        nuevo: comPlano.slice(0, 120) + (comPlano.length > 120 ? "…" : ""),
        categoria: ind.comentarios ? "TEXTO" : "ADICION",
      });
      if (!excl("comentarios")) registrar(codigo, "comentarios", comPlano);
    }
    const escalaNueva = comNuevo ? normEscala(comNuevo) : null;
    if (escalaNueva) {
      const actualEsc = ind.escala ?? [];
      const difiere =
        JSON.stringify(escalaNueva.map((e) => [e.nivel, e.pctMax])) !==
          JSON.stringify(actualEsc.map((e) => [e.nivel, e.pctMax])) ||
        escalaNueva.some(
          (e, i) => plano(e.descripcion) !== plano(actualEsc[i]?.descripcion ?? ""),
        );
      if (difiere) {
        add({
          codigo, campo: "escala",
          actual: actualEsc.map((e) => `${e.nivel}:${e.pctMax}%`).join(" · ") || "∅",
          nuevo: escalaNueva.map((e) => `${e.nivel}:${e.pctMax}%`).join(" · "),
          categoria: "ESCALA",
          nota: "niveles/descripciones del formulario de carga",
        });
        if (!excl("escala")) registrar(codigo, "escala", escalaNueva);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Reporte
  // -------------------------------------------------------------------------
  const porCat = (c: Categoria) => difs.filter((d) => d.categoria === c);
  const resumen = `ADICIÓN: ${porCat("ADICION").length} · TEXTO: ${porCat("TEXTO").length} · ESCALA: ${porCat("ESCALA").length} · CONFLICTO: ${porCat("CONFLICTO").length} · VACÍO EN FUENTE: ${porCat("VACIO_EN_FUENTE").length}`;

  let md = `# Reporte de diferencias — actualizacion.csv vs dataset canónico\n\n`;
  md += `Filas procesadas: ${codigosVistos.size}/83 indicadores AE · ${resumen}\n\n`;
  if (desconocidasGlobal.size) {
    md += `## ⚠ Dependencias no reconocidas (no se aplican)\n\n${[...desconocidasGlobal].map((d) => `- ${d}`).join("\n")}\n\n`;
  }
  for (const [cat, titulo] of [
    ["CONFLICTO", "🔴 CONFLICTOS (afectan el cálculo — requieren decisión)"],
    ["ESCALA", "🟦 Escalas de avance actualizadas"],
    ["ADICION", "🟢 Adiciones (campos vacíos que se llenan)"],
    ["TEXTO", "🟡 Cambios de texto"],
    ["VACIO_EN_FUENTE", "⚪ Vacíos en la fuente (se conserva lo actual)"],
  ] as const) {
    const items = porCat(cat as Categoria);
    if (!items.length) continue;
    md += `## ${titulo} (${items.length})\n\n| Cód. | Campo | Valor actual | Valor nuevo | Nota |\n|---|---|---|---|---|\n`;
    for (const d of items) {
      const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
      md += `| ${d.codigo} | ${d.campo} | ${esc(d.actual).slice(0, 90)} | ${esc(d.nuevo).slice(0, 90)} | ${d.nota ?? ""} |\n`;
    }
    md += "\n";
  }
  writeFileSync(REPORTE, md, "utf-8");

  console.log(`\nReporte → ${REPORTE}`);
  console.log(`Indicadores procesados: ${codigosVistos.size}/83 · ${resumen}\n`);
  const conflictos = porCat("CONFLICTO");
  if (conflictos.length) {
    console.log("CONFLICTOS detectados:");
    for (const d of conflictos) {
      console.log(`  ${d.codigo}.${d.campo}: ${d.actual}  →  ${d.nuevo}${d.nota ? `   (${d.nota})` : ""}`);
    }
  }

  // -------------------------------------------------------------------------
  // Fase B — aplicar
  // -------------------------------------------------------------------------
  if (!APLICAR) {
    console.log("\nFase A (solo reporte): indicadores.json NO fue modificado.");
    console.log("Para aplicar: npx tsx prisma/data/actualizar.ts --aplicar [--excluir cod.campo,…]");
    return;
  }

  let aplicados = 0;
  const actualizados = indicadores.map((ind) => {
    const c = cambios.get(ind.codigo);
    if (!c) return ind;
    aplicados++;
    const nuevo: IndicadorJson = { ...ind, ...c } as IndicadorJson;
    // coherencia lineaBase/nota
    if ("lineaBase" in c) {
      if (c.lineaBase === null) {
        nuevo.lineaBaseNota = (c as { lineaBaseNota?: string }).lineaBaseNota ?? ind.lineaBaseNota ?? "A determinar";
      } else {
        delete (nuevo as { lineaBaseNota?: string }).lineaBaseNota;
      }
    }
    return nuevo;
  });
  writeFileSync(
    join(DATA_DIR, "indicadores.json"),
    JSON.stringify(actualizados, null, 2) + "\n",
    "utf-8",
  );
  console.log(`\n✔ FASE B aplicada: ${aplicados} indicadores actualizados en indicadores.json`);
  if (EXCLUIR.size) console.log(`  Exclusiones respetadas: ${[...EXCLUIR].join(", ")}`);
  console.log("  Siguiente: npm run data:verify && npm run db:seed:test && npm run db:seed:prod");
}

main();
