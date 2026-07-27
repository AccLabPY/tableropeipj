/**
 * data:verify — Validación del dataset canónico ANTES de sembrar.
 * Exige exactamente 6 OE / 39 AE / 89 indicadores, metas completas,
 * coherencia estructural y cruce con las metas del prototipo de referencia.
 */
import {
  ANIOS_PEI,
  CODIGOS_DIAGNOSTICO,
  cargarAcciones,
  cargarIndicadores,
  cargarObjetivos,
  cargarRiesgos,
  esCicloVida,
} from "./load";

let errores = 0;
const fallo = (msg: string) => {
  errores++;
  console.error(`  ✗ ${msg}`);
};
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

const objetivos = cargarObjetivos();
const acciones = cargarAcciones();
const indicadores = cargarIndicadores();
const riesgos = cargarRiesgos();

console.log("Verificando dataset canónico PEI 2026-2030…\n");

// --- Conteos exactos -------------------------------------------------------
console.log("Conteos:");
objetivos.length === 6
  ? ok("6 Objetivos Estratégicos")
  : fallo(`OE: se esperaban 6, hay ${objetivos.length}`);
acciones.length === 39
  ? ok("39 Acciones Estratégicas")
  : fallo(`AE: se esperaban 39, hay ${acciones.length}`);
indicadores.length === 89
  ? ok("89 indicadores")
  : fallo(`Indicadores: se esperaban 89, hay ${indicadores.length}`);

const porOE = new Map<number, number>();
for (const ae of acciones) porOE.set(ae.oe, (porOE.get(ae.oe) ?? 0) + 1);
const esperadoAEporOE: Record<number, number> = {
  1: 8, 2: 5, 3: 8, 4: 7, 5: 4, 6: 7,
};
for (const [oe, n] of Object.entries(esperadoAEporOE)) {
  porOE.get(Number(oe)) === n
    ? ok(`OE${oe}: ${n} AE`)
    : fallo(`OE${oe}: se esperaban ${n} AE, hay ${porOE.get(Number(oe)) ?? 0}`);
}

const nivelOE = indicadores.filter((i) => i.nivel === "OE");
const nivelAE = indicadores.filter((i) => i.nivel === "AE");
nivelOE.length === 6
  ? ok("6 indicadores de nivel OE (códigos 1-6)")
  : fallo(`Indicadores nivel OE: ${nivelOE.length}`);
nivelAE.length === 83
  ? ok("83 indicadores de nivel AE")
  : fallo(`Indicadores nivel AE: ${nivelAE.length}`);

// --- Integridad estructural ------------------------------------------------
console.log("\nIntegridad estructural:");
const codigosAE = new Set(acciones.map((a) => a.codigo));
const codigosVistos = new Set<number>();
for (const ind of indicadores) {
  if (codigosVistos.has(ind.codigo)) fallo(`código duplicado: ${ind.codigo}`);
  codigosVistos.add(ind.codigo);

  if (ind.nivel === "AE") {
    if (!ind.ae) fallo(`${ind.codigo}: nivel AE sin código de AE`);
    else if (!codigosAE.has(ind.ae))
      fallo(`${ind.codigo}: AE inexistente ${ind.ae}`);
    // Semántica OAAI: 1101 → OE1, AE1
    const oeDelCodigo = Math.floor(ind.codigo / 1000);
    const aeDelCodigo = Math.floor((ind.codigo % 1000) / 100);
    if (oeDelCodigo !== ind.oe)
      fallo(`${ind.codigo}: OE del código (${oeDelCodigo}) ≠ oe (${ind.oe})`);
    if (ind.ae && ind.ae !== `A.E.${oeDelCodigo}.${aeDelCodigo}`)
      fallo(`${ind.codigo}: AE del código ≠ ${ind.ae}`);
  } else if (ind.ae !== null) {
    fallo(`${ind.codigo}: nivel OE con AE asignada`);
  }

  if (ind.metas.length !== ANIOS_PEI.length)
    fallo(`${ind.codigo}: metas incompletas (${ind.metas.length}/5)`);
  if (ind.dependencias.length === 0)
    fallo(`${ind.codigo}: sin dependencias responsables`);
  if (ind.lineaBase === null && !ind.lineaBaseNota)
    fallo(`${ind.codigo}: línea base null sin nota "a determinar"`);
  if (ind.escala) {
    const niveles = ind.escala.map((e) => e.nivel);
    if (new Set(niveles).size !== niveles.length)
      fallo(`${ind.codigo}: niveles de escala duplicados`);
    const maxs = ind.escala.map((e) => e.pctMax);
    if (![...maxs].every((v, i, a) => i === 0 || v > a[i - 1]))
      fallo(`${ind.codigo}: pctMax de escala no es creciente`);
  }
}
ok("códigos OAAI coherentes, metas x5, dependencias y escalas válidas");

// --- Flags -----------------------------------------------------------------
console.log("\nFlags derivados:");
const diagEnDataset = indicadores.filter((i) =>
  CODIGOS_DIAGNOSTICO.has(i.codigo),
);
diagEnDataset.length === CODIGOS_DIAGNOSTICO.size
  ? ok(`${CODIGOS_DIAGNOSTICO.size} indicadores con requiereDiagnostico`)
  : fallo(
      `requiereDiagnostico: ${diagEnDataset.length}/${CODIGOS_DIAGNOSTICO.size} presentes`,
    );
const cicloVida = indicadores.filter((i) => esCicloVida(i.metas));
cicloVida.length >= 12 && cicloVida.length <= 16
  ? ok(`${cicloVida.length} indicadores de ciclo de vida (~14 esperados)`)
  : fallo(`ciclo de vida fuera de rango: ${cicloVida.length}`);
const escalas = indicadores.filter((i) => i.escala && i.escala.length > 0);
escalas.length >= 25 && escalas.length <= 33
  ? ok(`${escalas.length} indicadores de escala (~29 esperados)`)
  : fallo(`escala fuera de rango: ${escalas.length}`);
const basePend = indicadores.filter((i) => i.lineaBase === null);
basePend.length === 4
  ? ok("4 con línea base a determinar (5, 3101, 3102, 3103)")
  : fallo(`base pendiente: ${basePend.map((i) => i.codigo).join(", ")}`);

// --- Cruce con metas del prototipo (Formulación Estratégica Integrada) -----
console.log("\nCruce contra metas de referencia del prototipo:");
const MS: Record<number, (number | null)[]> = {
  1101: [10, 35, 55, 75, 100],
  1301: [20, 40, 60, 80, 100],
  1502: [3.2, 3.4, 3.6, 3.8, 4],
  1601: [20, 40, 60, 80, 100],
  2201: [25, 50, 75, 100, 0],
  2301: [5, 10, 15, 20, 30],
  2302: [500, 1500, 2500, 3500, 4000],
  3101: [1.05, 1.2, 1.4, 1.5, 1.5],
  3201: [95, 90, 80, 70, 60],
  3801: [5, 15, 20, 25, 30],
  3805: [10, 25, 45, 70, 100],
  4102: [257, 265, 278, 285, 298],
  4202: [20, 25, 50, 65, 75],
  4401: [3.5, 3.5, 3.7, 3.8, 3.9],
  5102: [90, 90, 90, 95, 95],
  5401: [272543, 294399, 311882, 332426, 351257],
  6102: [70, 80, 90, 90, 100],
  6103: [70, 80, 90, 100, 100],
};
for (const [codStr, metasRef] of Object.entries(MS)) {
  const cod = Number(codStr);
  const ind = indicadores.find((i) => i.codigo === cod);
  if (!ind) {
    fallo(`referencia ${cod} no encontrada en el dataset`);
    continue;
  }
  const igual = metasRef.every((m, idx) => ind.metas[idx] === m);
  igual
    ? ok(`${cod} metas coinciden`)
    : fallo(
        `${cod}: metas dataset [${ind.metas}] ≠ referencia [${metasRef}]`,
      );
}

// --- Riesgos ---------------------------------------------------------------
console.log("\nRiesgos:");
riesgos.length === 21
  ? ok("21 riesgos estratégicos")
  : fallo(`riesgos: se esperaban 21, hay ${riesgos.length}`);
for (const r of riesgos) {
  if (r.probabilidad * r.impacto < 1 || r.probabilidad * r.impacto > 9)
    fallo(`riesgo "${r.descripcion}": calificación fuera de 1-9`);
}

console.log(
  errores === 0
    ? "\n✔ Dataset canónico VÁLIDO (6 OE · 39 AE · 89 indicadores)"
    : `\n✖ Dataset con ${errores} error(es)`,
);
process.exit(errores === 0 ? 0 : 1);
