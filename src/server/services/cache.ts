/**
 * Infraestructura de caché en memoria por proceso (TiDB está en us-east-1:
 * cada round-trip cuesta ~200 ms; el objetivo es 0 queries en caliente).
 *
 * - TTL por entrada + stale-while-revalidate: vencida una entrada se sirve el
 *   valor anterior AL INSTANTE y se recomputa en background (dedupe inflight).
 * - Registro global de stores: `invalidarEstadoPEI()` limpia todo tras
 *   cualquier mutación (aprobar mediciones, editar matriz, umbrales, switch).
 * - Sin dependencias de servicios: los services definen sus propios cachés.
 */

interface Entrada {
  v: unknown;
  exp: number;
}

const g = globalThis as unknown as {
  __peiCaches?: Map<string, Map<string, Entrada>>;
};
const caches = (g.__peiCaches ??= new Map());
const inflight = new Map<string, Promise<unknown>>();

function store(nombre: string): Map<string, Entrada> {
  let s = caches.get(nombre);
  if (!s) {
    s = new Map();
    caches.set(nombre, s);
  }
  return s;
}

/** Limpia TODOS los cachés de la plataforma (llamar tras cada mutación). */
export function invalidarEstadoPEI(): void {
  caches.forEach((s) => s.clear());
}

export const TTL_CORTO = 60_000; // estado computado / fichas
export const TTL_LARGO = 5 * 60_000; // catálogos casi estáticos

/**
 * Lee del caché `nombre` o computa. Con `swr`, una entrada vencida se sirve
 * igual mientras un único refresco corre en background.
 */
export async function conTTL<T>(
  nombre: string,
  key: string,
  ttl: number,
  swr: boolean,
  fn: () => Promise<T>,
): Promise<T> {
  const s = store(nombre);
  const hit = s.get(key);
  const ahora = Date.now();
  if (hit && hit.exp > ahora) return hit.v as T;

  const ik = `${nombre}:${key}`;
  const computar = async (): Promise<T> => {
    const v = await fn();
    s.set(key, { v, exp: Date.now() + ttl });
    return v;
  };

  if (hit && swr) {
    // Vencida pero presente: servir stale y refrescar en background (dedupe).
    if (!inflight.has(ik)) {
      const p = computar()
        .catch((e) => console.error(`[cache ${nombre}] refresco falló:`, e))
        .finally(() => inflight.delete(ik));
      inflight.set(ik, p as Promise<unknown>);
    }
    return hit.v as T;
  }

  // Sin valor previo: computar (con dedupe de requests concurrentes).
  const existente = inflight.get(ik);
  if (existente) return existente as Promise<T>;
  const p = computar().finally(() => inflight.delete(ik));
  inflight.set(ik, p as Promise<unknown>);
  return p;
}
