/**
 * Tipos del dominio puro. Este módulo NO importa Prisma, Next ni React.
 * Los valores numéricos del dominio son `number` (los Decimal de Prisma
 * mueren en la capa de services, ver src/server/services/mappers.ts).
 */

export type Sentido = "ASC" | "DESC";

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO" | "GRIS";

/** Estados del workflow institucional (espejo del enum Prisma EstadoWF). */
export type EstadoWF =
  | "BORRADOR"
  | "ENVIADO"
  | "EN_REVISION"
  | "OBSERVADO"
  | "APROBADO"
  | "RECHAZADO"
  | "RECTIFICADO";

/** Roles de usuario (espejo del enum Prisma RolUsuario). */
export type RolUsuario =
  | "ADMIN"
  | "DGPD_VALIDADOR"
  | "DEPENDENCIA_CARGA"
  | "AUTORIDAD"
  | "CONSULTA";

export interface EntradaCumplimiento {
  /** Línea base; null => pendiente de determinar. */
  base: number | null;
  /** Meta del período; null => sin meta definida. */
  meta: number | null;
  /** Valor observado (medición aprobada); null => sin dato. */
  valor: number | null;
  sentido: Sentido;
  /** Ciclo de vida: la meta "0" post-cierre significa concluido, no meta cero. */
  metaConcluida?: boolean;
}

export type EstadoCumplimiento =
  | "OK"
  | "PENDIENTE_BASE"
  | "SIN_DATO"
  | "NO_APLICA";

export interface ResultadoCumplimiento {
  /** Fracción cruda (puede ser > 1 = sobrecumplimiento). */
  real: number | null;
  /** Acotado a [0,1] para agregaciones y semáforo. */
  capado: number | null;
  estado: EstadoCumplimiento;
}

/** Umbral de semáforo en FRACCIONES 0..1 (los registros en DB están en %). */
export interface Umbral {
  verde: number;
  amarillo: number;
  azul?: number | null;
}

export interface Cobertura {
  /** Mediciones aprobadas del período. */
  aprobadas: number;
  /** Mediciones esperadas del período. */
  esperadas: number;
  /** aprobadas/esperadas en 0..1 (0 si esperadas = 0). */
  fraccion: number;
}
