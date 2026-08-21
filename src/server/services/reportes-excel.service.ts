import ExcelJS from "exceljs";
import type { Ctx } from "@/server/db/env";
import { listarCompletos } from "@/server/repositories/indicador.repo";
import { visiblesDelPeriodo } from "@/server/repositories/medicion.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { noEncontrado } from "@/server/api/api-error";
import type { IndicadorEstadoDTO } from "@/shared/dtos/estado-pei";
import { calcularEstadoPEI, catalogoIndicadores } from "./estado-pei.service";
import { fichaIndicador } from "./indicador-ficha.service";
import { num } from "./mappers";

/**
 * Planillas .xlsx de los reportes (solo server). Estilo institucional:
 * cabecera navy, primera fila congelada, anchos por columna.
 */

const NAVY = "FF14395B";

function hoja(
  wb: ExcelJS.Workbook,
  nombre: string,
  columnas: { header: string; key: string; width: number }[],
) {
  const ws = wb.addWorksheet(nombre, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = columnas;
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  return ws;
}

async function aBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const SEM_LABEL: Record<string, string> = {
  VERDE: "En meta",
  AMARILLO: "En riesgo",
  ROJO: "Crítico",
  GRIS: "Pendiente",
};

/** Nombre de hoja válido para Excel (≤31 caracteres, sin \/*?[]:). */
function nombreHoja(s: string): string {
  return s.replace(/[\\/*?[\]:]/g, "").slice(0, 31) || "Hoja";
}

/** Hoja estándar de indicadores con su estado del ejercicio. */
function hojaEstadoIndicadores(
  wb: ExcelJS.Workbook,
  titulo: string,
  anio: number,
  filas: IndicadorEstadoDTO[],
) {
  const ws = hoja(wb, nombreHoja(titulo), [
    { header: "Código", key: "codigo", width: 9 },
    { header: "Indicador", key: "nombre", width: 60 },
    { header: "OE", key: "oe", width: 7 },
    { header: "AE", key: "ae", width: 9 },
    { header: "Unidad", key: "unidad", width: 12 },
    { header: "Sentido", key: "sentido", width: 12 },
    { header: "Línea base", key: "base", width: 11 },
    { header: `Meta ${anio}`, key: "meta", width: 11 },
    { header: "Concluido", key: "concluido", width: 10 },
    { header: "Valor vigente", key: "valor", width: 13 },
    { header: "Cumplimiento", key: "cumpl", width: 13 },
    { header: "Semáforo", key: "sem", width: 11 },
    { header: "Estado de carga", key: "wf", width: 14 },
    { header: "Dependencia principal", key: "dep", width: 42 },
  ]);
  for (const e of filas) {
    ws.addRow({
      codigo: e.codigo,
      nombre: e.nombre,
      oe: e.oeCodigo,
      ae: e.aeCodigo ?? "—",
      unidad: e.unidad,
      sentido: e.sentido === "ASC" ? "Ascendente" : "Descendente",
      base: e.basePendiente ? "a determinar" : (e.lineaBase ?? "—"),
      meta: e.metaConcluida ? "—" : (e.meta ?? "—"),
      concluido: e.metaConcluida ? "Sí" : "No",
      valor: e.valor ?? "—",
      cumpl: e.capado ?? "—",
      sem: SEM_LABEL[e.semaforo],
      wf: e.estadoMedicion ?? "SIN CARGA",
      dep: e.dependenciaPrincipal,
    });
  }
  ws.getColumn("cumpl").numFmt = "0.0%";
  return ws;
}

/** Catálogo completo con avances del ejercicio. */
export async function excelCatalogo(ctx: Ctx, anio: number): Promise<Buffer> {
  const [indicadores, estado] = await Promise.all([
    listarCompletos(ctx),
    calcularEstadoPEI(ctx, anio),
  ]);
  const estadoPorCodigo = new Map(estado.indicadores.map((e) => [e.codigo, e]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";
  const ws = hoja(wb, `Catálogo ${anio}`, [
    { header: "Código", key: "codigo", width: 9 },
    { header: "Indicador", key: "nombre", width: 60 },
    { header: "OE", key: "oe", width: 7 },
    { header: "AE", key: "ae", width: 9 },
    { header: "Dimensión", key: "dimension", width: 12 },
    { header: "Unidad", key: "unidad", width: 12 },
    { header: "Sentido", key: "sentido", width: 12 },
    { header: "Línea base", key: "base", width: 11 },
    { header: `Meta ${anio}`, key: "meta", width: 11 },
    { header: "Concluido", key: "concluido", width: 10 },
    { header: "Valor vigente", key: "valor", width: 13 },
    { header: "Cumplimiento", key: "cumpl", width: 13 },
    { header: "Semáforo", key: "sem", width: 11 },
    { header: "Estado de carga", key: "wf", width: 14 },
    { header: "Dependencia principal", key: "dep", width: 42 },
    { header: "Corresponsables", key: "corresp", width: 50 },
  ]);

  for (const ind of indicadores) {
    const e = estadoPorCodigo.get(ind.codigo);
    ws.addRow({
      codigo: ind.codigo,
      nombre: ind.nombre,
      oe: ind.oe.codigo,
      ae: ind.ae?.codigo ?? "—",
      dimension: ind.dimension ?? "—",
      unidad: ind.unidad,
      sentido: ind.sentido === "ASC" ? "Ascendente" : "Descendente",
      base: num(ind.lineaBase) ?? "a determinar",
      meta: e?.metaConcluida ? "—" : (e?.meta ?? "—"),
      concluido: e?.metaConcluida ? "Sí" : "No",
      valor: e?.valor ?? "—",
      cumpl: e?.capado ?? "—",
      sem: e ? SEM_LABEL[e.semaforo] : "—",
      wf: e?.estadoMedicion ?? "SIN CARGA",
      dep:
        ind.responsables.find((r) => r.rol === "PRINCIPAL")?.dependencia
          .nombre ?? "—",
      corresp:
        ind.responsables
          .filter((r) => r.rol === "CORRESPONSABLE")
          .map((r) => r.dependencia.nombre)
          .join(" | ") || "—",
    });
  }
  ws.getColumn("cumpl").numFmt = "0.0%";
  return aBuffer(wb);
}

/** Mediciones completas del período (respeta el scoping del actor). */
export async function excelMediciones(ctx: Ctx, anio: number): Promise<Buffer> {
  const [periodo, catalogo] = await Promise.all([
    periodoAnual(ctx, anio),
    catalogoIndicadores(ctx),
  ]);
  const mediciones = await visiblesDelPeriodo(ctx, periodo.id);
  const indPorId = new Map(catalogo.map((i) => [i.id, i]));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";
  const ws = hoja(wb, `Mediciones ${anio}`, [
    { header: "Indicador", key: "codigo", width: 10 },
    { header: "Nombre", key: "nombre", width: 55 },
    { header: "Versión", key: "version", width: 8 },
    { header: "Estado", key: "estado", width: 13 },
    { header: "Variables", key: "vars", width: 30 },
    { header: "Nivel escala", key: "nivel", width: 11 },
    { header: "Valor observado", key: "valor", width: 14 },
    { header: "Fuente", key: "fuente", width: 40 },
    { header: "Observaciones", key: "obs", width: 50 },
    { header: "Fecha reporte", key: "freporte", width: 13 },
    { header: "Fecha corte", key: "fcorte", width: 13 },
    { header: "Dependencia", key: "dep", width: 42 },
    { header: "Validación", key: "val", width: 12 },
    { header: "Comentario validación", key: "valcom", width: 40 },
    { header: "Evidencias", key: "evid", width: 10 },
  ]);

  for (const m of mediciones) {
    const vars =
      m.valoresVariables && typeof m.valoresVariables === "object"
        ? Object.entries(m.valoresVariables as Record<string, unknown>)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ")
        : "";
    const ultimaVal = m.validaciones[0];
    const ind = indPorId.get(m.indicadorId);
    ws.addRow({
      codigo: ind?.codigo ?? m.indicadorId,
      nombre: ind?.nombre ?? "",
      version: m.version,
      estado: m.estado,
      vars,
      nivel: m.nivelEscala ?? "",
      valor: num(m.valorObservado),
      fuente: m.fuente ?? "",
      obs: m.observaciones ?? "",
      freporte: m.fechaReporte,
      fcorte: m.fechaCorte ?? "",
      dep: m.dependencia.nombre,
      val: ultimaVal?.resultado ?? "",
      valcom: ultimaVal?.comentario ?? "",
      evid: m.evidencias.length,
    });
  }
  ws.getColumn("freporte").numFmt = "dd/mm/yyyy";
  ws.getColumn("fcorte").numFmt = "dd/mm/yyyy";
  return aBuffer(wb);
}

/** Un objetivo estratégico: hoja resumen (AEs) + hoja de indicadores. */
export async function excelOE(
  ctx: Ctx,
  numero: number,
  anio: number,
): Promise<{ buffer: Buffer; nombre: string }> {
  const estado = await calcularEstadoPEI(ctx, anio);
  const oe = estado.objetivos.find((o) => o.numero === numero);
  if (!oe) throw noEncontrado(`Objetivo estratégico ${numero}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";

  const res = hoja(wb, "Resumen", [
    { header: "Acción estratégica", key: "codigo", width: 11 },
    { header: "Nombre", key: "nombre", width: 70 },
    { header: `Avance ${anio}`, key: "avance", width: 12 },
    { header: "Semáforo", key: "sem", width: 11 },
  ]);
  res.addRow({
    codigo: oe.codigo,
    nombre: `${oe.nombre} (rollup del objetivo)`,
    avance: oe.avance ?? "—",
    sem: SEM_LABEL[oe.semaforo],
  }).font = { bold: true };
  for (const ae of oe.acciones) {
    res.addRow({
      codigo: ae.codigo,
      nombre: ae.nombre,
      avance: ae.avance ?? "—",
      sem: SEM_LABEL[ae.semaforo],
    });
  }
  res.getColumn("avance").numFmt = "0.0%";

  const filas = [
    ...(oe.indicadorOE ? [oe.indicadorOE] : []),
    ...oe.acciones.flatMap((a) => a.indicadores),
  ];
  hojaEstadoIndicadores(wb, "Indicadores", anio, filas);
  return { buffer: await aBuffer(wb), nombre: `oe${numero}-pei-${anio}.xlsx` };
}

/** Una acción estratégica: sus indicadores con estado del ejercicio. */
export async function excelAE(
  ctx: Ctx,
  aeCodigo: string,
  anio: number,
): Promise<{ buffer: Buffer; nombre: string }> {
  const estado = await calcularEstadoPEI(ctx, anio);
  const ae = estado.objetivos
    .flatMap((o) => o.acciones)
    .find((a) => a.codigo === aeCodigo);
  if (!ae) throw noEncontrado(`Acción estratégica ${aeCodigo}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";
  hojaEstadoIndicadores(wb, ae.codigo, anio, ae.indicadores);
  return {
    buffer: await aBuffer(wb),
    nombre: `${ae.codigo.toLowerCase().replace(/\./g, "")}-pei-${anio}.xlsx`,
  };
}

/** Una dependencia: sus indicadores a cargo (principal). */
export async function excelDependencia(
  ctx: Ctx,
  depId: number,
  anio: number,
): Promise<{ buffer: Buffer; nombre: string }> {
  const estado = await calcularEstadoPEI(ctx, anio);
  const filas = estado.indicadores.filter(
    (i) => i.dependenciaPrincipalId === depId,
  );
  if (filas.length === 0) throw noEncontrado("Dependencia con indicadores");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";
  hojaEstadoIndicadores(wb, filas[0].dependenciaPrincipal, anio, filas);
  return {
    buffer: await aBuffer(wb),
    nombre: `dependencia-${depId}-pei-${anio}.xlsx`,
  };
}

/** Un indicador: ficha técnica + trayectoria quinquenal + mediciones. */
export async function excelIndicador(
  ctx: Ctx,
  codigo: number,
  anio: number,
): Promise<{ buffer: Buffer; nombre: string }> {
  const ficha = await fichaIndicador(ctx, codigo, anio);
  const est = ficha.estado;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Plataforma PEI 2026-2030 · CSJ Paraguay";

  // Hoja 1 · Ficha técnica (clave/valor)
  const f = hoja(wb, "Ficha", [
    { header: "Campo", key: "campo", width: 28 },
    { header: "Valor", key: "valor", width: 100 },
  ]);
  const filasFicha: [string, string | number][] = [
    ["Código", est.codigo],
    ["Indicador", est.nombre],
    ["Objetivo estratégico", `${est.oeCodigo} — ${ficha.oeNombre}`],
    ...(est.aeCodigo
      ? ([["Acción estratégica", `${est.aeCodigo} — ${ficha.aeNombre}`]] as [
          string,
          string,
        ][])
      : []),
    ["Descripción", ficha.descripcion ?? "—"],
    ["Fórmula", ficha.formula ?? "—"],
    ["Variables", ficha.variables ?? "—"],
    ["Unidad", est.unidad],
    ["Sentido", est.sentido === "ASC" ? "Ascendente" : "Descendente"],
    ["Dimensión", est.dimension ?? "—"],
    [
      "Línea base",
      est.basePendiente
        ? "a determinar"
        : `${est.lineaBase ?? "—"} (${ficha.anioLineaBase ?? "—"})`,
    ],
    ["Frecuencia", ficha.frecuencia],
    ["Cobertura", ficha.cobertura],
    ["Fuentes de información", ficha.fuenteInfo ?? "—"],
    [
      "Responsables",
      ficha.responsables.map((r) => `${r.nombre} (${r.rol})`).join(" · ") ||
        "—",
    ],
    [`Cumplimiento ${anio}`, est.capado !== null ? `${(est.capado * 100).toFixed(1)}%` : "—"],
    ["Semáforo", SEM_LABEL[est.semaforo]],
  ];
  for (const [campo, valor] of filasFicha) f.addRow({ campo, valor });
  f.getColumn("campo").font = { bold: true, size: 10 };
  f.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

  // Hoja 2 · Trayectoria quinquenal
  const t = hoja(wb, "Trayectoria", [
    { header: "Año", key: "anio", width: 8 },
    { header: "Meta", key: "meta", width: 12 },
    { header: "Concluido", key: "concluido", width: 10 },
    { header: "Valor aprobado", key: "valor", width: 14 },
    { header: "Cumplimiento", key: "cumpl", width: 13 },
  ]);
  for (const tr of ficha.trayectoria) {
    t.addRow({
      anio: tr.anio,
      meta: tr.metaConcluida ? "—" : (tr.meta ?? "—"),
      concluido: tr.metaConcluida ? "Sí" : "No",
      valor: tr.valor ?? "—",
      cumpl: tr.capado ?? "—",
    });
  }
  t.getColumn("cumpl").numFmt = "0.0%";

  // Hoja 3 · Mediciones (todas las versiones)
  const m = hoja(wb, "Mediciones", [
    { header: "Período", key: "periodo", width: 9 },
    { header: "Versión", key: "version", width: 8 },
    { header: "Estado", key: "estado", width: 13 },
    { header: "Variables", key: "vars", width: 30 },
    { header: "Nivel escala", key: "nivel", width: 11 },
    { header: "Valor observado", key: "valor", width: 14 },
    { header: "Fuente", key: "fuente", width: 45 },
    { header: "Observaciones", key: "obs", width: 60 },
    { header: "Fecha reporte", key: "freporte", width: 13 },
    { header: "Validación", key: "val", width: 12 },
    { header: "Comentario validación", key: "valcom", width: 45 },
    { header: "Evidencias", key: "evid", width: 30 },
  ]);
  for (const med of ficha.mediciones) {
    m.addRow({
      periodo: med.periodoAnio,
      version: med.version,
      estado: med.estado,
      vars: med.valoresVariables
        ? Object.entries(med.valoresVariables)
            .map(([k, v]) => `${k}=${v}`)
            .join(" · ")
        : "",
      nivel: med.nivelEscala ?? "",
      valor: med.valorObservado ?? "",
      fuente: med.fuente ?? "",
      obs: med.observaciones ?? "",
      freporte: med.fechaReporte.slice(0, 10),
      val: med.validaciones[0]?.resultado ?? "",
      valcom: med.validaciones[0]?.comentario ?? "",
      evid: med.evidencias.map((e) => e.nombreArchivo).join(" | "),
    });
  }

  return {
    buffer: await aBuffer(wb),
    nombre: `indicador-${codigo}-pei-${anio}.xlsx`,
  };
}
