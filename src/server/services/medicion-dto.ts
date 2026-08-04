import type { EstadoWF } from "@/domain/types";
import type { UnidadDTO } from "@/shared/dtos/estado-pei";
import type {
  MedicionParaDTO,
  MedicionUltimaCarga,
} from "@/server/repositories/medicion.repo";
import type { MedicionResumenDTO } from "@/shared/dtos/indicador-ficha";
import type { UltimaCargaDTO } from "@/shared/dtos/ultimas-cargas";
import { bigId, iso, num } from "./mappers";

/** Sanea el Json de variables a Record<string, number> (o null). */
function valoresDeJson(j: unknown): Record<string, number> | null {
  if (!j || typeof j !== "object" || Array.isArray(j)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** Mapper Medicion(Prisma) → fila del widget de últimas cargas. */
export function toUltimaCarga(m: MedicionUltimaCarga): UltimaCargaDTO {
  return {
    id: bigId(m.id),
    codigo: m.indicador.codigo,
    nombre: m.indicador.nombre,
    unidad: m.indicador.unidad as UnidadDTO,
    periodoAnio: m.periodo.anio,
    valor: num(m.valorObservado),
    fuente: m.fuente,
    dependencia: m.dependencia.nombre,
    fechaCorte: iso(m.fechaCorte),
    fechaReporte: iso(m.fechaReporte)!,
  };
}

/** Mapper único Medicion(Prisma) → DTO serializable. */
export function toMedicionResumen(m: MedicionParaDTO): MedicionResumenDTO {
  return {
    id: bigId(m.id),
    version: m.version,
    estado: m.estado as EstadoWF,
    valorObservado: num(m.valorObservado),
    numerador: num(m.numerador),
    denominador: num(m.denominador),
    nivelEscala: m.nivelEscala,
    valoresVariables: valoresDeJson(m.valoresVariables),
    fechaReporte: iso(m.fechaReporte)!,
    fechaCorte: iso(m.fechaCorte),
    fuente: m.fuente,
    observaciones: m.observaciones,
    dependencia: m.dependencia.nombre,
    periodoAnio: m.periodo.anio,
    evidencias: m.evidencias.map((e) => ({
      id: bigId(e.id),
      nombreArchivo: e.nombreArchivo,
      tipo: e.tipo,
      mimeType: e.mimeType,
      tamanioBytes: e.tamanioBytes,
      tieneArchivo: e.rutaOUrl === null,
      rutaOUrl: e.rutaOUrl,
      fecha: iso(e.fecha)!,
    })),
    validaciones: m.validaciones.map((v) => ({
      resultado: v.resultado,
      comentario: v.comentario,
      fecha: iso(v.fecha)!,
    })),
  };
}
