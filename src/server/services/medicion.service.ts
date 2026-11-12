import { createHash } from "node:crypto";
import { Prisma, type EstadoWF as EstadoWFDb } from "@prisma/client";
import type { Ctx, CtxTx } from "@/server/db/env";
import { enTransaccion, esViolacionUnica } from "@/server/db/tx";
import {
  ESTADOS_EDITABLES,
  ESTADOS_NUEVA_VERSION,
  calcularValorObservado,
  clasificarFormula,
  dependenciasResponsables,
  esAutovalidacion,
  nivelAlcanzado,
  validarTransicion,
  variablesRequeridas,
  pctDeNivel,
} from "@/domain";
import type { EstadoWF } from "@/domain/types";
import { ApiError, noEncontrado, sinPermiso } from "@/server/api/api-error";
import {
  indicadorPorId,
  porCodigo,
  type IndicadorCompleto,
} from "@/server/repositories/indicador.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import {
  INCLUDE_MEDICION,
  scopeMediciones,
  type MedicionCompleta,
} from "@/server/repositories/medicion.repo";
import { tieneRol, type Actor } from "@/server/auth/guards";
import type { MedicionInput, ValidarInput, EvidenciaInput } from "@/shared/schemas/medicion";
import { num } from "./mappers";
import { invalidarEstadoPEI } from "./estado-cache";
import { catalogoIndicadores } from "./estado-pei.service";
import { exigirCargaHabilitada, ventanaDeIndicador } from "./plazos.service";
import { registrarEnvio } from "./sla.service";
import {
  notificarCriticoSiCorresponde,
  notificarTransicion,
} from "./notificaciones.service";

const D = (n: number) => new Prisma.Decimal(n);

/**
 * Casos de uso del workflow de mediciones.
 * - Historial APPEND-ONLY: toda transición escribe HistorialEstado en la misma
 *   transacción que el cambio de estado.
 * - Control optimista: el cambio de estado exige que la medición siga en el
 *   estado leído; si otra persona la movió antes, 409 ESTADO_CAMBIADO.
 * - Una medición APROBADA nunca se sobrescribe: rectificar crea versión nueva.
 * - Carga compartida: principal y corresponsables editan la misma medición.
 * - Autovalidación: quien intervino en una versión no puede resolverla.
 * - Notificaciones, SLA e invalidación de cachés van DESPUÉS del commit.
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

/** Alta del actor en los intervinientes de la versión (si no figura ya). */
function intervenir(
  intervinientesIds: readonly number[],
  actor: Actor,
): Prisma.MedicionUpdateManyMutationInput {
  return intervinientesIds.includes(actor.userId)
    ? {}
    : { intervinientesIds: { push: actor.userId } };
}

/**
 * Cambio de estado con control optimista + historial, dentro de una
 * transacción. Con READ COMMITTED, PostgreSQL reevalúa el `estado = desde`
 * tras el bloqueo de fila: de dos requests concurrentes, solo uno avanza.
 */
async function transicionarTx(
  tx: CtxTx,
  medicionId: bigint,
  desde: EstadoWF,
  hacia: EstadoWF,
  comentario?: string | null,
  extra: Prisma.MedicionUpdateManyMutationInput = {},
): Promise<void> {
  const { count } = await tx.db.medicion.updateMany({
    where: { id: medicionId, estado: desde as EstadoWFDb },
    data: { ...extra, estado: hacia as EstadoWFDb },
  });
  if (count !== 1) {
    throw new ApiError(
      409,
      "ESTADO_CAMBIADO",
      `La medición ya no está en estado ${desde}: otra persona la modificó. Recargue la página.`,
    );
  }
  await tx.db.historialEstado.create({
    data: {
      medicionId,
      estadoAnterior: desde as EstadoWFDb,
      estadoNuevo: hacia as EstadoWFDb,
      usuarioId: tx.actor.userId,
      comentario: comentario ?? null,
    },
  });
}

function exigirTransicion(actor: Actor, desde: EstadoWF, hacia: EstadoWF): void {
  const r = validarTransicion(desde, hacia, actor.roles);
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

/** ¿El actor carga con alcance limitado a sus dependencias? */
function esCargaScoped(actor: Actor): boolean {
  return (
    tieneRol(actor, "DEPENDENCIA_CARGA") &&
    !tieneRol(actor, "ADMIN", "DGPD_VALIDADOR")
  );
}

/**
 * Permiso de carga sobre un indicador: la dependencia del actor debe ser
 * PRINCIPAL o CORRESPONSABLE. ADMIN y DGPD no tienen restricción por
 * dependencia (DGPD igual no puede cargar: lo impide el guard de rol).
 */
function exigirPermisoCarga(actor: Actor, ind: IndicadorCompleto): void {
  if (!esCargaScoped(actor)) return;
  const deps = dependenciasResponsables(ind.responsables);
  if (!deps.some((d) => actor.dependenciaIds.includes(d))) throw sinPermiso();
}

/** Autovalidación: quien intervino en la versión no puede resolverla. */
function exigirNoAutovalidacion(actor: Actor, m: MedicionCompleta): void {
  if (esAutovalidacion(actor.userId, m.intervinientesIds)) {
    throw new ApiError(
      403,
      "AUTOVALIDACION",
      "No puede resolver una medición que usted cargó, editó o envió: debe hacerlo otro validador.",
    );
  }
}

/** Indicador de una medición: del catálogo cacheado o, si está inactivo, de la base. */
async function indicadorDeMedicion(
  ctx: Ctx,
  indicadorId: number,
): Promise<IndicadorCompleto> {
  const inds = await catalogoIndicadores(ctx);
  const ind = inds.find((i) => i.id === indicadorId) ?? (await indicadorPorId(ctx, indicadorId));
  if (!ind) throw noEncontrado("Indicador");
  return ind;
}

async function medicionOThrow(ctx: CtxTx, id: bigint): Promise<MedicionCompleta> {
  const m = await ctx.db.medicion.findFirst({
    where: { id, ...scopeMediciones(ctx.actor) },
    include: INCLUDE_MEDICION,
  });
  if (!m) throw noEncontrado("Medición");
  return m;
}

/** Traduce el choque de dos escrituras concurrentes sobre la misma versión. */
function concurrente(e: unknown): unknown {
  return esViolacionUnica(e)
    ? new ApiError(
        409,
        "CARGA_CONCURRENTE",
        "Otra persona registró esta medición al mismo tiempo. Recargue la página.",
      )
    : e;
}

/**
 * Deriva el valor observado con el MOTOR DE FÓRMULAS del dominio. El backend
 * SIEMPRE recalcula a partir de las variables base — nunca confía en un valor
 * precomputado por el cliente. Prioridad de modalidades:
 *   % de escala → nivelEscala → valores {a,b,c/valor} → legacy
 *   numerador/denominador → legacy valorObservado directo.
 * Devuelve además las variables normalizadas a persistir.
 */
function derivarValor(
  ind: IndicadorCompleto,
  input: MedicionInput,
): {
  valor: number;
  valores: Record<string, number> | null;
  /** Nivel de escala a persistir (derivado del % o informado). */
  nivel: number | null;
} {
  const escala = ind.escala.map((e) => ({
    nivel: e.nivel,
    pctMin: num(e.pctMin)!,
    pctMax: num(e.pctMax)!,
  }));

  // 1a) Escala con % editable (2026): el porcentaje manda y el nivel se
  //     deriva automáticamente (mayor nivel cuya cota se alcanzó).
  if (ind.esEscala && input.valorObservado != null) {
    const pct = input.valorObservado;
    if (pct < 0 || pct > 100) {
      throw new ApiError(
        422,
        "PORCENTAJE_INVALIDO",
        "El avance de un indicador de escala se reporta como porcentaje entre 0 y 100.",
      );
    }
    return {
      valor: pct,
      valores: null,
      nivel: nivelAlcanzado(escala, pct)?.nivel ?? null,
    };
  }

  // 1b) Escala por nivel (compatibilidad con la API previa): el nivel manda.
  if (input.nivelEscala != null) {
    const pct = pctDeNivel(escala, input.nivelEscala);
    if (pct === null) {
      throw new ApiError(
        422,
        "NIVEL_ESCALA_INVALIDO",
        "El nivel reportado no existe en la escala del indicador.",
      );
    }
    return { valor: pct, valores: null, nivel: input.nivelEscala };
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
    return { valor: r.valor, valores, nivel: null };
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
      nivel: null,
    };
  }
  if (input.valorObservado != null) {
    return {
      valor: input.valorObservado,
      valores:
        tipo === "VALOR_DIRECTO" ? { valor: input.valorObservado } : null,
      nivel: null,
    };
  }
  throw new ApiError(422, "VALOR_FALTANTE", "No se pudo derivar el valor observado.");
}

/**
 * Numerador y denominador de la fórmula, para reportes y la ETL futura.
 * En la suma-razón ((a)+(b))/(c) el numerador es a+b y el denominador c.
 */
function numeradorDenominador(
  ind: IndicadorCompleto,
  valores: Record<string, number> | null,
  input: MedicionInput,
): { numerador: number | null; denominador: number | null } {
  if (valores && clasificarFormula(ind.formula, ind.esEscala) === "SUMA_RAZON") {
    return { numerador: valores.a! + valores.b!, denominador: valores.c! };
  }
  return {
    numerador: valores?.a ?? input.numerador ?? null,
    denominador: valores?.b ?? input.denominador ?? null,
  };
}

/**
 * Crea o actualiza el BORRADOR de la medición del indicador/período.
 * - Sin medición: crea v1.
 * - Última versión RECHAZADA (circuito retirado): crea v+1 en BORRADOR.
 * - Última versión BORRADOR/OBSERVADO: la actualiza.
 * - En curso o aprobada: 409 (la corrección de una aprobada es `rectificar`).
 */
export async function guardarBorrador(
  ctx: Ctx,
  input: MedicionInput,
): Promise<MedicionCompleta> {
  const ind = await porCodigo(ctx, input.indicadorCodigo);
  if (!ind) throw noEncontrado(`Indicador ${input.indicadorCodigo}`);
  const principal = ind.responsables.find((r) => r.rol === "PRINCIPAL");
  if (!principal) throw new ApiError(422, "SIN_RESPONSABLE", "El indicador no tiene dependencia principal.");
  exigirPermisoCarga(ctx.actor, ind);
  await exigirCargaHabilitada(ctx, ind, input.anio);

  const periodo = await periodoAnual(ctx, input.anio);
  const { valor, valores, nivel } = derivarValor(ind, input);
  const { numerador, denominador } = numeradorDenominador(ind, valores, input);
  const datos = {
    numerador: numerador != null ? D(numerador) : null,
    denominador: denominador != null ? D(denominador) : null,
    nivelEscala: nivel,
    valoresVariables: valores ?? Prisma.JsonNull,
    valorObservado: D(valor),
    fuente: input.fuente ?? null,
    observaciones: input.observaciones ?? null,
  };
  const yo = ctx.actor.userId;

  let id: bigint;
  try {
    id = await enTransaccion(ctx, async (tx) => {
      const ultima = await tx.db.medicion.findFirst({
        where: { indicadorId: ind.id, periodoId: periodo.id },
        orderBy: { version: "desc" },
        select: { id: true, estado: true, version: true, intervinientesIds: true },
      });

      if (!ultima || ESTADOS_NUEVA_VERSION.includes(ultima.estado as EstadoWF)) {
        const creada = await tx.db.medicion.create({
          data: {
            indicadorId: ind.id,
            periodoId: periodo.id,
            dependenciaId: principal.dependenciaId,
            usuarioCargaId: yo,
            intervinientesIds: [yo],
            estado: "BORRADOR",
            version: (ultima?.version ?? 0) + 1,
            ...datos,
            fechaCorte: input.fechaCorte ?? null,
          },
        });
        await tx.db.historialEstado.create({
          data: {
            medicionId: creada.id,
            estadoAnterior: null,
            estadoNuevo: "BORRADOR",
            usuarioId: yo,
            comentario: ultima
              ? `Nueva versión tras la v${ultima.version} rechazada.`
              : null,
          },
        });
        return creada.id;
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
      const { count } = await tx.db.medicion.updateMany({
        where: {
          id: ultima.id,
          estado: { in: ESTADOS_EDITABLES as EstadoWFDb[] },
        },
        data: {
          ...datos,
          // `undefined` conserva la fecha de corte guardada; `null` la borra.
          fechaCorte: input.fechaCorte,
          dependenciaId: principal.dependenciaId,
          usuarioCargaId: yo,
          ...intervenir(ultima.intervinientesIds, ctx.actor),
        },
      });
      if (count !== 1) {
        throw new ApiError(
          409,
          "ESTADO_CAMBIADO",
          "La medición cambió de estado mientras la editaba. Recargue la página.",
        );
      }
      return ultima.id;
    });
  } catch (e) {
    throw concurrente(e);
  }
  invalidarEstadoPEI();
  return medicionOThrow(ctx, id);
}

/** BORRADOR/OBSERVADO → ENVIADO (dependencias responsables de la carga). */
export async function enviar(ctx: Ctx, id: bigint): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const ind = await indicadorDeMedicion(ctx, m.indicadorId);
  exigirPermisoCarga(ctx.actor, ind);
  await exigirCargaHabilitada(ctx, ind, m.periodo.anio);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx.actor, desde, "ENVIADO");
  if (!m.fuente?.trim()) {
    throw new ApiError(
      422,
      "FUENTE_REQUERIDA",
      "Indique la fuente o medio de verificación antes de enviar a validación.",
    );
  }
  await enTransaccion(ctx, (tx) =>
    transicionarTx(tx, m.id, desde, "ENVIADO", null, intervenir(m.intervinientesIds, ctx.actor)),
  );
  invalidarEstadoPEI();

  // Bitácora de SLA: puntualidad del envío frente al plazo vigente.
  const ventana = await ventanaDeIndicador(ctx, ind, m.periodo.anio);
  await registrarEnvio(ctx, {
    medicionId: m.id,
    indicadorId: m.indicadorId,
    dependenciaId: m.dependenciaId,
    periodoId: m.periodoId,
    ventana,
  });
  await notificarSeguro(ctx, m, "ENVIADO");
  return medicionOThrow(ctx, id);
}

/** ENVIADO → EN_REVISION (un validador que no intervino la toma). */
export async function tomarEnRevision(
  ctx: Ctx,
  id: bigint,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx.actor, desde, "EN_REVISION");
  exigirNoAutovalidacion(ctx.actor, m);
  await enTransaccion(ctx, (tx) => transicionarTx(tx, m.id, desde, "EN_REVISION"));
  invalidarEstadoPEI();
  await notificarSeguro(ctx, m, "EN_REVISION");
  return medicionOThrow(ctx, id);
}

/** Resolución del validador: APROBADO u OBSERVADO, con su Validacion. */
export async function validar(
  ctx: Ctx,
  id: bigint,
  input: ValidarInput,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx.actor, desde, input.resultado);
  exigirNoAutovalidacion(ctx.actor, m);
  const comentario = input.comentario?.trim() || null;
  await enTransaccion(ctx, async (tx) => {
    await transicionarTx(tx, m.id, desde, input.resultado, comentario);
    await tx.db.validacion.create({
      data: {
        medicionId: m.id,
        usuarioId: ctx.actor.userId,
        resultado: input.resultado,
        comentario,
      },
    });
  });
  invalidarEstadoPEI();
  await notificarSeguro(ctx, m, input.resultado, comentario);
  return medicionOThrow(ctx, id);
}

/**
 * Rectificación de una APROBADA: la versión vigente pasa a RECTIFICADO y se
 * crea la versión n+1 en BORRADOR con los datos y las evidencias copiadas
 * (append-only). La nueva versión conserva quién cargó los datos: la
 * autovalidación sigue impidiendo que lo resuelvan quienes intervinieron.
 */
export async function rectificar(
  ctx: Ctx,
  id: bigint,
  motivo: string,
): Promise<MedicionCompleta> {
  const m = await medicionOThrow(ctx, id);
  const desde = m.estado as EstadoWF;
  exigirTransicion(ctx.actor, desde, "RECTIFICADO");

  const nota = `Rectifica v${m.version}: ${motivo}`;
  let nuevaId: bigint;
  try {
    nuevaId = await enTransaccion(
      ctx,
      async (tx) => {
        await transicionarTx(tx, m.id, desde, "RECTIFICADO", motivo);
        const max = await tx.db.medicion.aggregate({
          where: { indicadorId: m.indicadorId, periodoId: m.periodoId },
          _max: { version: true },
        });
        const nueva = await tx.db.medicion.create({
          data: {
            indicadorId: m.indicadorId,
            periodoId: m.periodoId,
            dependenciaId: m.dependenciaId,
            circunscripcionId: m.circunscripcionId,
            usuarioCargaId: m.usuarioCargaId,
            intervinientesIds: m.intervinientesIds,
            estado: "BORRADOR",
            version: (max._max.version ?? m.version) + 1,
            numerador: m.numerador,
            denominador: m.denominador,
            nivelEscala: m.nivelEscala,
            valoresVariables: m.valoresVariables ?? Prisma.JsonNull,
            valorObservado: m.valorObservado,
            fuente: m.fuente,
            observaciones: m.observaciones ? `${m.observaciones}\n\n${nota}` : nota,
            fechaCorte: m.fechaCorte,
          },
        });
        // Copia de evidencias en la base: los binarios no pasan por Node.
        await tx.db.$executeRaw`
          INSERT INTO "Evidencia" ("medicionId", "nombreArchivo", "tipo", "rutaOUrl",
            "contenido", "mimeType", "tamanioBytes", "hashSha256", "fecha", "usuarioId", "estado")
          SELECT ${nueva.id}, "nombreArchivo", "tipo", "rutaOUrl", "contenido", "mimeType",
            "tamanioBytes", "hashSha256", "fecha", "usuarioId", 'heredada'
          FROM "Evidencia" WHERE "medicionId" = ${m.id}`;
        await tx.db.historialEstado.create({
          data: {
            medicionId: nueva.id,
            estadoAnterior: null,
            estadoNuevo: "BORRADOR",
            usuarioId: ctx.actor.userId,
            comentario: `Versión de rectificación de v${m.version}.`,
          },
        });
        return nueva.id;
      },
      { timeoutMs: 30_000 },
    );
  } catch (e) {
    throw concurrente(e);
  }
  invalidarEstadoPEI();
  const nueva = await medicionOThrow(ctx, nuevaId);
  await notificarSeguro(ctx, nueva, "RECTIFICADO", motivo);
  return nueva;
}

/**
 * Valida que se pueda adjuntar a la medición: permiso de carga, ventana
 * abierta y versión editable (BORRADOR u OBSERVADO). Una RECHAZADA primero
 * debe iniciar su versión nueva con guardarBorrador.
 */
async function exigirAdjuntable(ctx: Ctx, m: MedicionCompleta): Promise<void> {
  const ind = await indicadorDeMedicion(ctx, m.indicadorId);
  exigirPermisoCarga(ctx.actor, ind);
  await exigirCargaHabilitada(ctx, ind, m.periodo.anio);
  if (!ESTADOS_EDITABLES.includes(m.estado as EstadoWF)) {
    throw new ApiError(
      409,
      "MEDICION_EN_CURSO",
      `No se pueden adjuntar evidencias a una medición en estado ${m.estado}.`,
    );
  }
}

/** Registra metadatos de evidencia (legado: URL/ruta externa, sin binario). */
export async function agregarEvidencia(
  ctx: Ctx,
  id: bigint,
  input: EvidenciaInput,
): Promise<void> {
  const m = await medicionOThrow(ctx, id);
  await exigirAdjuntable(ctx, m);
  await enTransaccion(ctx, async (tx) => {
    await tx.db.evidencia.create({
      data: {
        medicionId: m.id,
        nombreArchivo: repararNombreArchivo(input.nombreArchivo),
        tipo: input.tipo ?? null,
        rutaOUrl: input.rutaOUrl,
        hashSha256: input.hashSha256 ?? null,
        usuarioId: ctx.actor.userId,
      },
    });
    await tx.db.medicion.updateMany({
      where: { id: m.id },
      data: intervenir(m.intervinientesIds, ctx.actor),
    });
  });
  invalidarEstadoPEI();
}

/**
 * Repara nombres de archivo con mojibake (bytes UTF-8 decodificados como
 * Latin-1 en el multipart: "aceptaciÃ³n" → "aceptación"). Solo actúa si el
 * patrón es inequívoco y la reparación produce texto válido.
 */
export function repararNombreArchivo(nombre: string): string {
  if (!/[ÃÂ][\u0080-¿]/.test(nombre)) return nombre;
  const reparado = Buffer.from(nombre, "latin1").toString("utf8");
  return reparado.includes("�") ? nombre : reparado;
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
  await exigirAdjuntable(ctx, m);
  const hashSha256 = createHash("sha256").update(archivo.contenido).digest("hex");
  await enTransaccion(
    ctx,
    async (tx) => {
      await tx.db.evidencia.create({
        data: {
          medicionId: m.id,
          nombreArchivo: repararNombreArchivo(archivo.nombreArchivo),
          rutaOUrl: null,
          contenido: archivo.contenido,
          mimeType: archivo.mimeType,
          tamanioBytes: archivo.contenido.length,
          hashSha256,
          usuarioId: ctx.actor.userId,
        },
      });
      await tx.db.medicion.updateMany({
        where: { id: m.id },
        data: intervenir(m.intervinientesIds, ctx.actor),
      });
    },
    { timeoutMs: 30_000 },
  );
  invalidarEstadoPEI();
}

/**
 * Elimina un adjunto.
 * - DGPD y ADMIN depuran adjuntos mientras la medición no sea oficial.
 * - Las dependencias responsables, solo mientras la medición es editable.
 */
export async function eliminarEvidencia(
  ctx: Ctx,
  evidenciaId: bigint,
): Promise<void> {
  const ev = await ctx.db.evidencia.findFirst({
    where: { id: evidenciaId, medicion: scopeMediciones(ctx.actor) },
    select: { medicion: { select: { estado: true, indicadorId: true } } },
  });
  if (!ev) throw noEncontrado("Evidencia");
  const estado = ev.medicion.estado as EstadoWF;

  if (tieneRol(ctx.actor, "ADMIN", "DGPD_VALIDADOR")) {
    // Una vez APROBADA (o archivada como RECTIFICADA) el expediente es inmutable.
    if (estado === "APROBADO" || estado === "RECTIFICADO") {
      throw new ApiError(
        409,
        "MEDICION_OFICIAL",
        "No se pueden eliminar adjuntos de una medición ya validada: rectifique la medición para corregirla.",
      );
    }
  } else {
    const ind = await indicadorDeMedicion(ctx, ev.medicion.indicadorId);
    exigirPermisoCarga(ctx.actor, ind);
    if (!ESTADOS_EDITABLES.includes(estado)) {
      throw new ApiError(
        409,
        "MEDICION_EN_CURSO",
        "Solo se pueden eliminar adjuntos mientras la medición es editable.",
      );
    }
  }
  await ctx.db.evidencia.delete({ where: { id: evidenciaId } });
  invalidarEstadoPEI();
}
