import type { UnidadDTO } from "@/shared/dtos/estado-pei";

/** Fila del widget "Últimas cargas aprobadas" del tablero ejecutivo. */
export interface UltimaCargaDTO {
  id: string;
  codigo: number;
  nombre: string;
  unidad: UnidadDTO;
  periodoAnio: number;
  valor: number | null;
  fuente: string | null;
  dependencia: string;
  fechaCorte: string | null;
  fechaReporte: string;
}
