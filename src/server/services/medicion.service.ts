import { createHash } from "node:crypto";
import { Prisma, type EstadoWF as EstadoWFDb } from "@prisma/client";
import type { Ctx } from "@/server/db/env";
import {
  ESTADOS_EDITABLES,
  calcularValorObservado,
  clasificarFormula,
  validarTransicion,
  variablesRequeridas,
  pctDeNivel,
} from "@/domain";
import type { EstadoWF } from "@/domain/types";
import { ApiError, noEncontrado, sinPermiso } from "@/server/api/api-error";
import {
  porCodigo,
  type IndicadorCompleto,
} from "@/server/repositories/indicador.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import {
  INCLUDE_MEDICION,
  scopeMediciones,
  type MedicionCompleta,
} from "@/server/repositories/medicion.repo";
import { tieneRol } from "@/server/auth/guards";
import type { MedicionInput, ValidarInput, EvidenciaInput } from "@/shared/schemas/medicion";
import { num } from "./mappers";
import { invalidarEstadoPEI } from "./estado-cache";
import {
  notificarCriticoSiCorresponde,
  notificarTransicion,
} from "./notificaciones.service";

const D = (n: number) => new Prisma.Decimal(n);

/**
 * Casos de uso del workflow de mediciones (§11).
 * - Historial APPEND-ONLY: toda transición escribe HistorialEstado.
 * - Una medición APROBADA nunca se sobrescribe: rectificar crea versión nueva.
 * - Las transiciones se validan con la máquina de estados del dominio.
 */

/** Emite notificaciones tras una transición. Nunca rompe el caso de uso. */
async function notificarSeguro(
  ctx: Ctx,
  m: MedicionCompleta,
  hacia: EstadoWF,
  comentario?: string | null,
): Promise<void> {
  try {
    await notificarTransicion(ctx, m, hacia, comentario);
    if (hacia === "APROBADO") await notificarCriticoSiCorresponde(ctx, m);
  } catch (e) {
    console.error("[notificaciones] fallo al emitir:", e);
  }
}

function transicionar(
  ctx: Ctx,
  medicionId: bigint,
  desde: EstadoWF | null,
  hacia: EstadoWF,
  comentario?: string | null,
) {
  invalidarEstadoPEI(); // toda transición puede alterar los tableros
  return Promise.all([
    ctx.db.medicion.update({
      where: { id: medicionId },
      data: { estado: hacia as EstadoWFDb },
    }),
    ctx.db.historialEstado.create({
      data: {
        medicionId,
        estadoAnterior: desde as EstadoWFDb | null,
        estadoNuevo: hacia as EstadoWFDb,
        usuarioId: ctx.actor.userId,
        comentario: comentario ?? null,
      },
    }),
  ]);
}

function exigirTransicion(ctx: Ctx, desde: EstadoWF, hacia: EstadoWF): void {
  const r = validarTransicion(desde, hacia, ctx.actor.roles);
  if (!r.ok) {
    throw new ApiError(
      r.error === "TRANSICION_INVALIDA" ? 422 : 403,
      r.error!,
      r.error === "TRANSICION_INVALIDA"
        ? `Transición inválida: ${desde} → ${hacia}.`
        : `Su rol no puede pasar una medición de ${desde} a ${hacia}.`,
    );
  }
}

function exigirPropiedad(ctx: Ctx, dependenciaId: number): void {
  const esScoped =
    tieneRol(ctx.actor, "DEPENDENCIA_CARGA") &&
    !tieneRol(ctx.actor, "ADMIN", "DGPD_VALIDADOR");
  if (esScoped && !ctx.actor.dependenciaIds.includes(dependenciaId)) {
    throw sinPermiso();
  }
}

async function medicionOThrow(ctx: Ctx, id: bigint): Promise<MedicionCompleta> {
  const m = await ctx.db.medicion.findFirst({
    where: { id, ...scopeMediciones(ctx.actor) },
    include: INCLUDE_MEDICION,
  });
  if (!m) throw noEncontrado("Medición");
  return m;
}

/**
 * Deriva el valor observado con el MOTOR DE FÓRMULAS del dominio. El backend
 * SIEMPRE recalcula a partir de las variables base — nunca confía en un valor
 * precomputado por el cliente. Prioridad de modalidades:
 *   nivelEscala → valores {a,b,c/valor} → legacy numerador/denominador →
 *   legacy valorObservado directo.
 * Devuelve además las variables normalizadas a persistir.
 */
async function derivarValor(
  ctx: Ctx,
  ind: IndicadorCompleto,
  input: MedicionInput,
): Promise<{ valor: number; valores: Record<string, number> | null }> {
  // 1) Escala: el nivel manda.
  if (input.nivelEscala != null) {
    const pct = pctDeNivel(
      ind.escala.map((e) => ({
        nivel: e.nivel,
        pctMin: num(e.pctMin)!,
        pctMax: num(e.pctMax)!,
      })),
      input.nivelEscala,
    );
    if (pct === null) {
      throw new ApiError(
        422,
        "NIVEL_ESCALA_INVALIDO",
        "El nivel reportado no existe en la escala del indicador.",
      );
    }
    return { valor: pct, valores: null };
  }

  const tipo = clasificarFormula(ind.formula, ind.esEscala);

  // 2) Variables base de la fórmula (modalidad principal).
  if (input.valores && Object.keys(input.valores).length > 0) {
    const r = calcularValorObservado(tipo, input.valores);
    if (r.error === "DENOMINADOR_CERO") {
      throw new ApiError(
        422,
        "DENOMINADOR_CERO",
        "El denominador de la fórmula no puede ser cero.",
      );
    }
    if (r.error === "VARIABLE_FALTANTE" || r.valor === null) {
      throw new ApiError(
        422,
        "VARIABLE_FALTANTE",
        `Faltan variables de la fórmula: se requieren ${variablesRequeridas(tipo)
          .map((v) => `(${v})`)
          .join(", ")}.`,
      );
    }
    const valores: Record<string, number> = {};
    for (const clave of variablesRequeridas(tipo)) {
      valores[clave] = input.valores[clave]!;
    }
    return { valor: r.valor, valores };
  }

  // 3) Compatibilidad con la API previa.
  if (input.numerador != null && input.denominador != null) {
    const r = calcularValorObservado(
      tipo === "RAZON" ? "RAZON" : "RAZON_PORCENTAJE",
      { a: input.numerador, b: input.denominador },
    );
    if (r.valor === null) {
      throw new ApiError(422, "DENOMINADOR_CERO", "El denominador no puede ser cero.");
    }
    return {
      valor: r.valor,
      valores: { a: input.numerador, b: input.denominador },
    };
  }
  if (input.valorObservado != null) {
    return {
      valor: input.valorObservado,
      valores:
        tipo === "VALOR_DIRECTO" ? { valor: input.valorObservado } : null,
    };
  }
  throw new ApiError(422, "VALOR_FALTANTE", "No se pudo derivar el valor observado.");
}

/**
 * Crea o actualiza el BORRADOR de la medición del indicador/período.
 * Si la última versión está en estado editable (BORRADOR/OBSERVADO) se
 * actualiza; si no existe medición, se crea v1; si está en curso o aprobada,
 * 409 (la corrección de una aprobada es `rectificar`).
 */
export async function guardarBorrador(
  ctx: Ctx,
  input: MedicionInput,
): Promise<MedicionCompleta> {
  const ind = await porCodigo(ctx, input.indicadorCodigo);
  if (!ind) throw noEncontrado(`Indicador ${input.indicadorCodigo}`);
  const principal = ind.responsables.find((r) => r.rol === "PRINCIPAL");
  if (!principal) throw new ApiError(422, "SIN_RESPONSABLE", "El indicador no tiene dependencia principal.");
  exigirPropiedad(ctx, principal.dependenciaId);

  const periodo = await periodoAnual(ctx, input.anio);
  const { valor, valores } = await derivarValor(ctx, ind, input);

  const existentes = await ctx.db.medicion.findMany({
    where: { indicadorId: ind.id, periodoId: periodo.id },
    orderBy: { version: "desc" },
    take: 1,
  });
  const ultima = existentes[0];
  invalidarEstadoPEI(); // el chip de estado de carga vive en el estado cacheado

  // a↦numerador, b↦denominador cuando la fórmula es una razón de 2 variables
  // (continuidad con reportes y la ETL futura).
  const numerador = valores?.a ?? input.numerador ?? null;
  const denominador = valores?.b ?? input.denominador ?? null;
  const datos = {
    numerador: numerador != null ? D(numerador) : null,
    denominador: denominador != null ? D(denominador) : null,
    nivelEscala: input.nivelEscala ?? null,
    valoresVariables: valores ?? Prisma.JsonNull,
    valorObservado: D(valor),
    fuente: input.fuente ?? null,
    observaciones: input.observaciones ?? null,
    fechaCorte: input.fechaCorte ?? null,
  };

  if (!ultima) {
    const creada = await ctx.db.medicion.create({
      data: {
        indicadorId: ind.id,
        periodoId: periodo.id,
        dependenciaId: principal.dependenciaId,
        usuarioCargaId: ctx.actor.userId,
        estado: "BORRADOR",
        version: 1,
        ...datos,
      },
    });
    await ctx.db.historialEstado.create({
      data: {
        medicionId: creada.id,
        estadoAnterior: null,
        estadoNuevo: "BORRADOR",
        usuarioId: ctx.actor.userId,
      },
    });
    return medicionOThrow(ctx, creada.id);
  }

  if (!ESTADOS_EDITABLES.includes(ultima.estado as EstadoWF)) {
    throw new ApiError(
      409,
      "MEDICION_EN_CURSO",
      `Ya existe una medición en estado ${ultima.estado} para este período. ` +
        (ultima.estado === "APROBADO"
          ? "Para corregirla, solicite una rectificación."
          : "Espere el resultado de la validación."),
    );
  }
  exigirPropiedad(ctx, ultima.dependenciaId);
  await ctx.db.medicion.update({ where: { id: ultima.id }, data: datos });
  return medicionOThrow(ctx, ultima.id);
}

/** BORRADOR/OBSERVADO → ENVIADO (dependencia dueña). */
export async function enviar(ctx: Ctx, id: bigint): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  exigirPropiedad(ctx, m.dependenciaId);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx, desde, "ENVIADO");
  await transicionar(ctx, m.id, desde, "ENVIADO");
  await notificarSeguro(ctx, m, "ENVIADO");
  return medicionOThrow(ctx, id);
}

/** ENVIADO → EN_REVISION (validador la toma). */
export async function tomarEnRevision(
  ctx: Ctx,
  id: bigint,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx, desde, "EN_REVISION");
  await transicionar(ctx, m.id, desde, "EN_REVISION");
  await notificarSeguro(ctx, m, "EN_REVISION");
  return medicionOThrow(ctx, id);
}

/** Resolución del validador: APROBADO / OBSERVADO / RECHAZADO + Validacion. */
export async function validar(
  ctx: Ctx,
  id: bigint,
  input: ValidarInput,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx, desde, input.resultado);
  await transicionar(ctx, m.id, desde, input.resultado, input.comentario);
  await ctx.db.validacion.create({
    data: {
      medicionId: m.id,
      usuarioId: ctx.actor.userId,
      resultado: input.resultado,
      comentario: input.comentario ?? null,
    },
  });
  await notificarSeguro(ctx, m, input.resultado, input.comentario);
  return medicionOThrow(ctx, id);
}

/**
 * Rectificación de una APROBADA: la versión vigente pasa a RECTIFICADO y se
 * crea la versión n+1 en BORRADOR con los datos copiados (append-only).
 */
export async function rectificar(
  ctx: Ctx,
  id: bigint,
  motivo: string,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx, desde, "RECTIFICADO");
  await transicionar(ctx, m.id, desde, "RECTIFICADO", motivo);

  const nueva = await ctx.db.medicion.create({
    data: {
      indicadorId: m.indicadorId,
      periodoId: m.periodoId,
      dependenciaId: m.dependenciaId,
      usuarioCargaId: ctx.actor.userId,
      estado: "BORRADOR",
      version: m.version + 1,
      numerador: m.numerador,
      denominador: m.denominador,
      nivelEscala: m.nivelEscala,
      valoresVariables: m.valoresVariables ?? Prisma.JsonNull,
      valorObservado: m.valorObservado,
      fuente: m.fuente,
      observaciones: `Rectifica v${m.version}: ${motivo}`,
      fechaCorte: m.fechaCorte,
    },
  });
  await ctx.db.historialEstado.create({
    data: {
      medicionId: nueva.id,
      estadoAnterior: null,
      estadoNuevo: "BORRADOR",
      usuarioId: ctx.actor.userId,
      comentario: `Versión de rectificación de v${m.version}.`,
    },
  });
  await notificarSeguro(ctx, m, "RECTIFICADO", motivo);
  return medicionOThrow(ctx, nueva.id);
}

/** Registra metadatos de evidencia (legado: URL/ruta externa, sin binario). */
export async function agregarEvidencia(
  ctx: Ctx,
  id: bigint,
  input: EvidenciaInput,
): Promise<void> {
  const m = await medicionOThrow(ctx, id);
  exigirPropiedad(ctx, m.dependenciaId);
  await ctx.db.evidencia.create({
    data: {
      medicionId: m.id,
      nombreArchivo: input.nombreArchivo,
      tipo: input.tipo ?? null,
      rutaOUrl: input.rutaOUrl,
      hashSha256: input.hashSha256 ?? null,
      usuarioId: ctx.actor.userId,
    },
  });
}

const EVIDENCIA_TAMANIO_MAXIMO = 25 * 1024 * 1024; // 25MB
const EVIDENCIA_TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/csv",
]);

/**
 * Adjunta un archivo respaldatorio (binario real, almacenado en la BD).
 * El backend SIEMPRE revalida tamaño y tipo — nunca confía en el cliente.
 */
export async function agregarEvidenciaArchivo(
  ctx: Ctx,
  id: bigint,
  archivo: { nombreArchivo: string; mimeType: string; contenido: Buffer },
): Promise<void> {
  if (archivo.contenido.length === 0) {
    throw new ApiError(422, "ARCHIVO_VACIO", "El archivo está vacío.");
  }
  if (archivo.contenido.length > EVIDENCIA_TAMANIO_MAXIMO) {
    throw new ApiError(
      422,
      "ARCHIVO_MUY_GRANDE",
      "El archivo supera el límite de 25 MB.",
    );
  }
  if (!EVIDENCIA_TIPOS_PERMITIDOS.has(archivo.mimeType)) {
    throw new ApiError(
      422,
      "TIPO_NO_PERMITIDO",
      "Tipo de archivo no permitido. Use PDF, imagen (JPG/PNG/WEBP), Excel, Word o CSV.",
    );
  }
  const m = await medicionOThrow(ctx, id);
  exigirPropiedad(ctx, m.dependenciaId);
  const hashSha256 = createHash("sha256").update(archivo.contenido).digest("hex");
  await ctx.db.evidencia.create({
    data: {
      medicionId: m.id,
      nombreArchivo: archivo.nombreArchivo,
      rutaOUrl: null,
      contenido: archivo.contenido,
      mimeType: archivo.mimeType,
      tamanioBytes: archivo.contenido.length,
      hashSha256,
      usuarioId: ctx.actor.userId,
    },
  });
}

/** Elimina un adjunto propio mientras la medición sigue editable. */
export async function eliminarEvidencia(
  ctx: Ctx,
  evidenciaId: bigint,
): Promise<void> {
  const ev = await ctx.db.evidencia.findUnique({
    where: { id: evidenciaId },
    include: { medicion: { select: { dependenciaId: true, estado: true } } },
  });
  if (!ev) throw noEncontrado("Evidencia");
  exigirPropiedad(ctx, ev.medicion.dependenciaId);
  if (!ESTADOS_EDITABLES.includes(ev.medicion.estado as EstadoWF)) {
    throw new ApiError(
      409,
      "MEDICION_EN_CURSO",
      "Solo se pueden eliminar adjuntos mientras la medición es editable.",
    );
  }
  await ctx.db.evidencia.delete({ where: { id: evidenciaId } });
}
