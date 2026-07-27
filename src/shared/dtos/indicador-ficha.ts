import type { EstadoWF, Semaforo } from "@/domain/types";
import type { IndicadorEstadoDTO } from "./estado-pei";

/** Fila de la trayectoria quinquenal del detalle de indicador. */
export interface TrayectoriaAnioDTO {
  anio: number;
  meta: number | null;
  metaConcluida: boolean;
  valor: number | null;
  capado: number | null;
  semaforo: Semaforo | null; // null = año futuro sin dato (planificado)
}

export interface EscalaNivelDTO {
  nivel: number;
  descripcion: string;
  pctMin: number;
  pctMax: number;
}

export interface ResponsableDTO {
  dependenciaId: number;
  nombre: string;
  rol: "PRINCIPAL" | "CORRESPONSABLE" | "FUENTE";
}

export interface MedicionResumenDTO {
  id: string; // BigInt → string
  version: number;
  estado: EstadoWF;
  valorObservado: number | null;
  numerador: number | null;
  denominador: number | null;
  nivelEscala: number | null;
  fechaReporte: string;
  fechaCorte: string | null;
  fuente: string | null;
  observaciones: string | null;
  dependencia: string;
  periodoAnio: number;
  evidencias: { nombreArchivo: string; rutaOUrl: string; fecha: string }[];
  validaciones: {
    resultado: "APROBADO" | "OBSERVADO" | "RECHAZADO";
    comentario: string | null;
    fecha: string;
  }[];
}

/** Ficha completa del indicador para la vista de detalle. */
export interface IndicadorFichaDTO {
  estado: IndicadorEstadoDTO; // estado del año consultado
  descripcion: string | null;
  variables: string | null;
  formula: string | null;
  ambito: string | null;
  frecuencia: string;
  cobertura: string;
  anioLineaBase: number | null;
  fuenteInfo: string | null;
  comentarios: string | null;
  aeNombre: string | null;
  oeNombre: string;
  trayectoria: TrayectoriaAnioDTO[];
  escala: EscalaNivelDTO[];
  responsables: ResponsableDTO[];
  mediciones: MedicionResumenDTO[];
}
