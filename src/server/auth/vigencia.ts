import { prismaControl } from "@/server/db/client";
import type { RolUsuario } from "@/domain/types";
import { esTema, TEMA_DEFAULT, type Tema } from "@/shared/tema";

/**
 * Vigencia de la cuenta para revalidar la sesión JWT en cada request (Node).
 * Caché propia por usuario (no la de conTTL: no debe usar stale-while-
 * revalidate ni vaciarse con cada mutación de datos). Un cambio de roles,
 * dependencias, activo o sesionVersion rige en ≤ TTL; las acciones de
 * administración invalidan la entrada para que rija al instante.
 */

export interface VigenciaUsuario {
  activo: boolean;
  sesionVersion: number;
  nombre: string;
  email: string;
  roles: RolUsuario[];
  dependenciaIds: number[];
  tema: Tema;
}

const TTL = 60_000;
/** Un corte breve de la base no desloguea a todos: se usa la última lectura. */
const GRACIA_ERROR = 5 * 60_000;

interface Entrada {
  v: VigenciaUsuario | null;
  exp: number;
  leido: number;
}

const g = globalThis as unknown as {
  __peiVigencia?: {
    gen: number;
    datos: Map<number, Entrada>;
    inflight: Map<number, Promise<VigenciaUsuario | null>>;
  };
};
const st = (g.__peiVigencia ??= { gen: 0, datos: new Map(), inflight: new Map() });

async function leer(id: number): Promise<VigenciaUsuario | null> {
  const u = await prismaControl().usuario.findUnique({
    where: { id },
    select: {
      activo: true,
      sesionVersion: true,
      nombre: true,
      email: true,
      tema: true,
      roles: { select: { rol: true } },
      dependencias: { select: { dependenciaId: true } },
    },
  });
  if (!u) return null;
  return {
    activo: u.activo,
    sesionVersion: u.sesionVersion,
    nombre: u.nombre,
    email: u.email,
    roles: u.roles.map((r) => r.rol as RolUsuario),
    dependenciaIds: u.dependencias.map((d) => d.dependenciaId),
    tema: esTema(u.tema) ? u.tema : TEMA_DEFAULT,
  };
}

export function vigenciaUsuario(id: number): Promise<VigenciaUsuario | null> {
  const hit = st.datos.get(id);
  if (hit && hit.exp > Date.now()) return Promise.resolve(hit.v);
  const enVuelo = st.inflight.get(id);
  if (enVuelo) return enVuelo;

  const gen = st.gen;
  const p: Promise<VigenciaUsuario | null> = leer(id)
    .then(
      (v) => {
        if (st.gen === gen) st.datos.set(id, { v, exp: Date.now() + TTL, leido: Date.now() });
        return v;
      },
      (e) => {
        if (hit && Date.now() - hit.leido < GRACIA_ERROR) return hit.v;
        throw e;
      },
    )
    .finally(() => {
      if (st.inflight.get(id) === p) st.inflight.delete(id);
    });
  st.inflight.set(id, p);
  return p;
}

/** Descarta la vigencia cacheada de un usuario (o de todos). */
export function invalidarVigencia(id?: number): void {
  st.gen++;
  if (id === undefined) {
    st.datos.clear();
    st.inflight.clear();
  } else {
    st.datos.delete(id);
    st.inflight.delete(id);
  }
}
