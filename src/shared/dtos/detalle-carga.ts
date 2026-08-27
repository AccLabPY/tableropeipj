import type { EstadoWF } from "@/domain/types";
import type { MedicionResumenDTO } from "./indicador-ficha";
import type { VariableDef } from "@/domain/formula";
import type { VentanaDTO } from "./registro";

/** Un evento del historial de estados, con el actor resuelto. */
export interface EventoHistorialDTO {
  estadoAnterior: EstadoWF | null;
  estadoNuevo: EstadoWF;
  actorNombre: string | null;
  comentario: string | null;
  fecha: string;
}

/** Resolución de la DGPD con actor y fecha. */
export interface ResolucionDTO {
  resultado: "APROBADO" | "OBSERVADO" | "RECHAZADO";
  actorNombre: string | null;
  comentario: string | null;
  fecha: string;
}

/** Vista de detalle de una carga individual (medición). */
export interface DetalleCargaDTO {
  medicion: MedicionResumenDTO;
  indicador: {
    codigo: number;
    nombre: string;
    oeCodigo: string;
    aeCodigo: string | null;
    unidad: string;
    variablesDef: VariableDef[];
    dependenciaId: number | null;
  };
  /** Ventana de carga vigente (plazo / prórroga / cierre). */
  ventana: VentanaDTO;
  cargadorNombre: string | null;
  /** true si no existe una versión posterior de este indicador/período. */
  esUltimaVersion: boolean;
  historial: EventoHistorialDTO[];
  resoluciones: ResolucionDTO[];
}
