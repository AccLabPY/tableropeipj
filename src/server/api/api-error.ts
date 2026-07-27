/** Error tipado de la API v1 → se traduce al envelope { error } con HTTP code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

export const noAutenticado = () =>
  new ApiError(401, "NO_AUTENTICADO", "Debe iniciar sesión.");
export const sinPermiso = () =>
  new ApiError(403, "SIN_PERMISO", "No tiene permisos para esta operación.");
export const noEncontrado = (que = "Recurso") =>
  new ApiError(404, "NO_ENCONTRADO", `${que} no encontrado.`);
