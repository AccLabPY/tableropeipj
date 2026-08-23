/** DTOs del sistema de notificaciones in-app (campanita). */

export type TipoNotificacion =
  | "CARGA_ENVIADA"
  | "CARGA_EN_REVISION"
  | "CARGA_APROBADA"
  | "CARGA_OBSERVADA"
  | "CARGA_RECHAZADA"
  | "CARGA_RECTIFICADA"
  | "INDICADOR_CRITICO";

export interface NotificacionDTO {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string | null;
  /** Destino del click (ruta interna). */
  url: string;
  leida: boolean;
  /** ISO 8601. */
  creadaEn: string;
}

export interface NotificacionesRespuesta {
  items: NotificacionDTO[];
  noLeidas: number;
}
