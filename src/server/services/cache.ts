/**
 * Caché en memoria por proceso (la aplicación corre como una única instancia).
 *
 * - TTL por entrada + stale-while-revalidate: vencida una entrada se sirve el
 *   valor anterior al instante y se recomputa una sola vez en background.
 * - Generación por store: un cálculo que empezó antes de una invalidación no
 *   se guarda al terminar, así no repuebla el caché con datos previos a la
 *   mutación. Por eso `invalidarEstadoPEI()` se llama DESPUÉS del commit.
 * - Stores e inflight viven en globalThis: Server Actions y Server Components
 *   pueden instanciar este módulo más de una vez.
 */

interface Entrada {
  v: unknown;
  exp: number;
}

interface Store {
  gen: number;
  datos: Map<string, Entrada>;
  inflight: Map<string, { gen: number; p: Promise<unknown> }>;
}

const g = globalThis as unknown as { __peiCacheStores?: Map<string, Store> };
const stores = (g.__peiCacheStores ??= new Map());

function store(nombre: string): Store {
  let s = stores.get(nombre);
  if (!s) {
    s = { gen: 0, datos: new Map(), inflight: new Map() };
    stores.set(nombre, s);
  }
  return s;
}

function vaciar(s: Store): void {
  s.gen++;
  s.datos.clear();
  s.inflight.clear();
}

/** Limpia TODOS los cachés. Llamar después del commit de cada mutación. */
export function invalidarEstadoPEI(): void {
  stores.forEach(vaciar);
}

/** Limpia solo los stores indicados. */
export function invalidarStore(...nombres: string[]): void {
  for (const n of nombres) {
    const s = stores.get(n);
    if (s) vaciar(s);
  }
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
  const hit = s.datos.get(key);
  if (hit && hit.exp > Date.now()) return hit.v as T;

  const lanzar = (): Promise<T> => {
    const gen = s.gen;
    const p = fn().then((v) => {
      if (s.gen === gen) s.datos.set(key, { v, exp: Date.now() + ttl });
      return v;
    });
    const reg = { gen, p: p as Promise<unknown> };
    s.inflight.set(key, reg);
    const limpiar = () => {
      if (s.inflight.get(key) === reg) s.inflight.delete(key);
    };
    p.then(limpiar, limpiar);
    return p;
  };

  const enVuelo = s.inflight.get(key);
  if (hit && swr) {
    if (!enVuelo) {
      lanzar().catch((e) => console.error(`[cache ${nombre}] refresco falló:`, e));
    }
    return hit.v as T;
  }
  if (enVuelo && enVuelo.gen === s.gen) return enVuelo.p as Promise<T>;
  return lanzar();
}
