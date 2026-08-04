import type { Sentido } from "@/domain/types";
import type { TipoCalculo, VariableDef } from "@/domain/formula";
import type { UnidadDTO } from "./estado-pei";
import type { EscalaNivelDTO, MedicionResumenDTO } from "./indicador-ficha";

/** Ítem de la worklist del Registro: todo lo que necesita el formulario. */
export interface RegistroItemDTO {
  /** Tipo de cálculo derivado de la fórmula (motor de dominio formula.ts). */
  tipoCalculo: TipoCalculo;
  /** Variables base mapeadas con su descripción breve para el formulario. */
  variablesDef: VariableDef[];
  codigo: number;
  nombre: string;
  descripcion: string | null;
  formula: string | null;
  oeCodigo: string;
  aeCodigo: string | null;
  unidad: UnidadDTO;
  sentido: Sentido;
  esEscala: boolean;
  basePendiente: boolean;
  lineaBase: number | null;
  meta: number | null;
  metaConcluida: boolean;
  dependenciaPrincipal: string;
  escala: EscalaNivelDTO[];
  /** Umbral efectivo en fracciones (para el semáforo en vivo). */
  umbralVerde: number;
  umbralAmarillo: number;
  /** Última versión de medición del período (null = sin carga). */
  medicion: MedicionResumenDTO | null;
}

export interface RegistroDTO {
  anio: number;
  items: RegistroItemDTO[];
  /** true si el actor puede validar (DGPD/ADMIN). */
  puedeValidar: boolean;
  /** true si el actor puede cargar (dependencia/ADMIN). */
  puedeCargar: boolean;
}
