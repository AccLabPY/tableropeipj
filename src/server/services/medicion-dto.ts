import type { EstadoWF } from "@/domain/types";
import type { MedicionParaDTO } from "@/server/repositories/medicion.repo";
import type { MedicionResumenDTO } from "@/shared/dtos/indicador-ficha";
import { bigId, iso, num } from "./mappers";

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
    fechaReporte: iso(m.fechaReporte)!,
    fechaCorte: iso(m.fechaCorte),
    fuente: m.fuente,
    observaciones: m.observaciones,
    dependencia: m.dependencia.nombre,
    periodoAnio: m.periodo.anio,
    evidencias: m.evidencias.map((e) => ({
      nombreArchivo: e.nombreArchivo,
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
