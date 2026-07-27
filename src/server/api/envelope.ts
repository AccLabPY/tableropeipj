import { ZodError } from "zod";
import { ApiError } from "./api-error";

/**
 * Envelope uniforme de la API v1: { data, meta?, error? }.
 * `manejar` envuelve un handler y traduce ApiError/ZodError al formato.
 */
export interface Meta {
  page?: number;
  pageSize?: number;
  total?: number;
  [k: string]: unknown;
}

export function ok<T>(data: T, meta?: Meta, init?: ResponseInit): Response {
  return Response.json({ data, ...(meta ? { meta } : {}) }, init);
}

export function fallo(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

/** Wrapper estándar de Route Handlers: validación y errores al envelope. */
export function manejar<Ctx = unknown>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return fallo(e.status, e.code, e.message, e.details);
      }
      if (e instanceof ZodError) {
        return fallo(422, "VALIDACION", "Datos inválidos.", e.flatten());
      }
      console.error("[api] error no controlado:", e);
      return fallo(500, "ERROR_INTERNO", "Error interno del servidor.");
    }
  };
}
