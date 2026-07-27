import type {
  EstadoCumplimiento,
  EstadoWF,
  Semaforo,
  Sentido,
} from "@/domain/types";

/**
 * DTOs planos y serializables del estado computado del PEI.
 * Solo string | number | boolean | null: los Decimal/BigInt de Prisma
 * mueren en la capa de services (mappers).
 */

export type UnidadDTO = "PORCENTAJE" | "NUMERO" | "PUNTAJE" | "INDICE";

export interface IndicadorEstadoDTO {
  codigo: number;
  nivel: "OE" | "AE";
  oeCodigo: string;
  aeCodigo: string | null;
  nombre: string;
  unidad: UnidadDTO;
  sentido: Sentido;
  dimension: string | null;
  lineaBase: number | null;
  basePendiente: boolean;
  requiereDiagnostico: boolean;
  esCicloVida: boolean;
  esEscala: boolean;
  /** Meta del año consultado (null si no definida). */
  meta: number | null;
  /** true si el "0" del año es post-cierre (ciclo de vida concluido). */
  metaConcluida: boolean;
  /** Valor observado de la medición APROBADA vigente del período. */
  valor: number | null;
  /** Estado de workflow de la última versión de medición (null = sin carga). */
  estadoMedicion: EstadoWF | null;
  /** Cumplimiento normalizado. */
  real: number | null;
  capado: number | null;
  estadoCumplimiento: EstadoCumplimiento;
  semaforo: Semaforo;
  /** Umbral efectivo aplicado (fracciones) y su origen en la herencia. */
  umbralVerde: number;
  umbralAmarillo: number;
  umbralOrigen: "INDICADOR" | "AE" | "OE" | "GLOBAL";
  dependenciaPrincipal: string;
  dependenciaIds: number[];
}

export interface AEEstadoDTO {
  codigo: string;
  nombre: string;
  oeCodigo: string;
  avance: number | null;
  semaforo: Semaforo;
  indicadores: IndicadorEstadoDTO[];
}

export interface OEEstadoDTO {
  codigo: string;
  numero: number;
  nombre: string;
  pnd: string[];
  ods: number[];
  avance: number | null;
  semaforo: Semaforo;
  acciones: AEEstadoDTO[];
  /** Indicador de nivel OE (códigos 1..6). */
  indicadorOE: IndicadorEstadoDTO | null;
}

export interface CoberturaDTO {
  aprobadas: number;
  esperadas: number;
  fraccion: number;
}

export interface EstadoPeiDTO {
  anio: number;
  indicePEI: number | null;
  cobertura: CoberturaDTO;
  distribucion: Record<Semaforo, number>;
  objetivos: OEEstadoDTO[];
  /** Los 89 indicadores en plano (para catálogo/filtros). */
  indicadores: IndicadorEstadoDTO[];
}
