/**
 * Carga de MEDICIONES REALES (avances 2025/2026 extraídos de evidencias
 * oficiales del Poder Judicial) desde prisma/data/mediciones-reales.json.
 *
 *   npm run db:seed:mediciones:test   (ensayo contra la base de prueba)
 *   npm run db:seed:mediciones:prod   (carga oficial)
 *
 * Reglas:
 * - El valor observado SIEMPRE se recalcula con el motor de fórmulas del
 *   dominio; si difiere del esperado documentado (> 0.01) el script aborta.
 * - Las mediciones "ALTA" entran directo en APROBADO como carga administrativa
 *   (usuario admin id 1: historial BORRADOR→ENVIADO→APROBADO + validación).
 * - Las "CONDICIONADA" quedan en BORRADOR (no alimentan tableros) con sus
 *   observaciones de condicionalidad.
 * - Idempotente: re-ejecutar actualiza la versión 1 nacional de cada
 *   indicador+período y regenera historial/validación/evidencia.
 * - Requiere el seed estructural previo (npm run db:seed:*): indicadores,
 *   dependencias y períodos (crea el período 2025 id 6 si faltara).
 */
import { PrismaClient, Prisma, EstadoWF } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  calcularValorObservado,
  type TipoCalculo,
} from "../src/domain/formula";

const prisma = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);

interface MedicionReal {
  codigo: number;
  anio: number;
  etiqueta: string;
  fechaCorte: string;
  tipoFormula: TipoCalculo;
  valores?: Record<string, number>;
  nivelEscala?: number;
  esperado: number;
  fuente: string;
  evidencia: { nombreArchivo: string; rutaOUrl: string };
  observaciones: string;
  confianza: "ALTA" | "CONDICIONADA";
  estadoDestino: "APROBADO" | "BORRADOR";
}

const ADMIN_ID = 1;

async function periodoAnual(anio: number): Promise<{ id: number }> {
  const existente = await prisma.periodo.findFirst({
    where: { anio, tipo: "ANUAL", numero: null },
    select: { id: true },
  });
  if (existente) return existente;
  if (anio !== 2025) {
    throw new Error(
      `Período anual ${anio} no existe: correr primero el seed estructural.`,
    );
  }
  return prisma.periodo.create({
    data: {
      id: 6,
      anio: 2025,
      tipo: "ANUAL",
      fechaInicio: new Date("2025-01-01T00:00:00Z"),
      fechaFin: new Date("2025-12-31T23:59:59Z"),
      fechaLimiteCarga: new Date("2026-02-28T23:59:59Z"),
    },
    select: { id: true },
  });
}

/** Valor observado recalculado (nunca se confía en el precalculado). */
async function recalcular(m: MedicionReal, indicadorId: number): Promise<number> {
  if (m.tipoFormula === "NIVEL_ESCALA") {
    const nivel = m.nivelEscala;
    if (nivel === undefined) {
      throw new Error(`${m.codigo}: NIVEL_ESCALA sin nivelEscala`);
    }
    if (nivel === 0) return 0; // ningún nivel alcanzado
    const fila = await prisma.escalaIndicador.findFirst({
      where: { indicadorId, nivel },
    });
    if (!fila) throw new Error(`${m.codigo}: nivel ${nivel} no existe en la escala`);
    return Number(fila.pctMax);
  }
  const r = calcularValorObservado(m.tipoFormula, m.valores ?? {});
  if (r.error || r.valor === null) {
    throw new Error(`${m.codigo}: error de cálculo ${r.error}`);
  }
  return r.valor;
}

/** Mapeo de continuidad a las columnas legacy numerador/denominador. */
function legacy(m: MedicionReal): { num: number | null; den: number | null } {
  const v = m.valores ?? {};
  switch (m.tipoFormula) {
    case "RAZON":
    case "RAZON_PORCENTAJE":
      return { num: v.a ?? null, den: v.b ?? null };
    case "SUMA_RAZON":
      return { num: (v.a ?? 0) + (v.b ?? 0), den: v.c ?? null };
    default:
      return { num: null, den: null };
  }
}

async function cargar(m: MedicionReal): Promise<string> {
  const ind = await prisma.indicador.findUniqueOrThrow({
    where: { codigo: m.codigo },
    select: { id: true },
  });
  const principal = await prisma.indicadorDependencia.findFirstOrThrow({
    where: { indicadorId: ind.id, rol: "PRINCIPAL" },
  });
  const periodo = await periodoAnual(m.anio);

  const valor = await recalcular(m, ind.id);
  if (Math.abs(valor - m.esperado) > 0.01) {
    throw new Error(
      `${m.codigo} (${m.etiqueta}): recalculado ${valor} ≠ esperado ${m.esperado}`,
    );
  }

  const { num, den } = legacy(m);
  const data = {
    indicadorId: ind.id,
    periodoId: periodo.id,
    dependenciaId: principal.dependenciaId,
    circunscripcionId: null,
    numerador: num !== null ? D(num) : null,
    denominador: den !== null ? D(den) : null,
    nivelEscala: m.nivelEscala !== undefined ? m.nivelEscala : null,
    valoresVariables:
      m.valores !== undefined ? m.valores : Prisma.JsonNull,
    valorObservado: D(valor),
    estado: m.estadoDestino as EstadoWF,
    version: 1,
    fuente: m.fuente,
    observaciones: m.observaciones,
    usuarioCargaId: ADMIN_ID,
    fechaCorte: new Date(`${m.fechaCorte}T00:00:00Z`),
  };

  // Idempotencia: una medición nacional (circunscripción null) v1 por
  // indicador+período; el unique con null no deduplica en MySQL → findFirst.
  const existente = await prisma.medicion.findFirst({
    where: {
      indicadorId: ind.id,
      periodoId: periodo.id,
      circunscripcionId: null,
      version: 1,
    },
    select: { id: true },
  });
  let medId: bigint;
  if (existente) {
    await prisma.medicion.update({ where: { id: existente.id }, data });
    await prisma.historialEstado.deleteMany({ where: { medicionId: existente.id } });
    await prisma.validacion.deleteMany({ where: { medicionId: existente.id } });
    await prisma.evidencia.deleteMany({ where: { medicionId: existente.id } });
    medId = existente.id;
  } else {
    const creada = await prisma.medicion.create({ data, select: { id: true } });
    medId = creada.id;
  }

  // Historial como carga administrativa directa (admin id 1).
  const cadena: EstadoWF[] =
    m.estadoDestino === "APROBADO"
      ? ["BORRADOR", "ENVIADO", "APROBADO"]
      : ["BORRADOR"];
  let anterior: EstadoWF | null = null;
  for (const e of cadena) {
    await prisma.historialEstado.create({
      data: {
        medicionId: medId,
        estadoAnterior: anterior,
        estadoNuevo: e,
        usuarioId: ADMIN_ID,
        comentario:
          e === "APROBADO"
            ? "Carga directa de medición oficial verificada (admin)."
            : e === "BORRADOR" && m.estadoDestino === "BORRADOR"
              ? "Carga condicionada: pendiente de validación institucional."
              : null,
      },
    });
    anterior = e;
  }
  if (m.estadoDestino === "APROBADO") {
    await prisma.validacion.create({
      data: {
        medicionId: medId,
        usuarioId: ADMIN_ID,
        resultado: "APROBADO",
        comentario:
          "Carga inicial desde evidencia oficial (agregado nacional verificado).",
      },
    });
  }
  await prisma.evidencia.create({
    data: {
      medicionId: medId,
      nombreArchivo: m.evidencia.nombreArchivo,
      tipo: "documento",
      rutaOUrl: m.evidencia.rutaOUrl,
      usuarioId: ADMIN_ID,
      estado: m.estadoDestino === "APROBADO" ? "validada" : "cargada",
    },
  });

  return `${existente ? "↻" : "＋"} ${m.codigo} · ${m.etiqueta} · valor ${valor} · ${m.estadoDestino}`;
}

async function main() {
  if (process.env.SEED_MOCKUP === "1") {
    throw new Error(
      "seedMediciones no debe correr con SEED_MOCKUP=1 (mezclaría demo y datos reales).",
    );
  }
  const registros: MedicionReal[] = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "data", "mediciones-reales.json"), "utf-8"),
  );
  console.log(`Cargando ${registros.length} mediciones reales…`);
  for (const m of registros) console.log("  " + (await cargar(m)));

  const [total, porEstado] = await Promise.all([
    prisma.medicion.count(),
    prisma.medicion.groupBy({ by: ["estado"], _count: { _all: true } }),
  ]);
  const resumen = porEstado
    .map((g) => `${g.estado}: ${g._count._all}`)
    .sort()
    .join(" · ");
  console.log(`\nOK · Mediciones en la base: ${total} (${resumen})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
