import type { Ctx } from "@/server/db/env";
import { diasHasta, type VentanaEfectiva } from "@/domain";
import { conTTL, TTL_CORTO } from "./cache";

/**
 * SLA de carga: puntualidad de las dependencias frente al plazo vigente.
 * Se registra una fila por ENVÍO a validación (append-only, sin borrados),
 * de modo que el atraso quede medido aunque después se otorgue una prórroga.
 */

export interface SlaDependenciaDTO {
  dependenciaId: number;
  dependencia: string;
  envios: number;
  enPlazo: number;
  fueraDePlazo: number;
  conProrroga: number;
  /** Fracción 0..1 de envíos dentro del plazo (null si no hubo envíos). */
  puntualidad: number | null;
  /** Días de atraso promedio de los envíos fuera de plazo (null si ninguno). */
  atrasoPromedio: number | null;
  atrasoMaximo: number | null;
}

/** Registra el envío en la bitácora de SLA. Nunca rompe el caso de uso. */
export async function registrarEnvio(
  ctx: Ctx,
  datos: {
    medicionId: bigint;
    indicadorId: number;
    dependenciaId: number;
    periodoId: number;
    ventana: VentanaEfectiva;
  },
): Promise<void> {
  try {
    const ahora = new Date();
    const limite = datos.ventana.fechaLimite;
    // diasHasta > 0 ⇒ envío anticipado; < 0 ⇒ atraso. Guardamos el desvío con
    // signo positivo = atraso para que las lecturas sean directas.
    const desvio = limite ? -diasHasta(limite, ahora) : null;
    await ctx.db.slaCarga.create({
      data: {
        medicionId: datos.medicionId,
        indicadorId: datos.indicadorId,
        dependenciaId: datos.dependenciaId,
        periodoId: datos.periodoId,
        fechaLimite: limite,
        fechaEnvio: ahora,
        diasDesvio: desvio,
        enPlazo: desvio === null ? true : desvio <= 0,
        conProrroga: datos.ventana.conProrroga,
      },
    });
  } catch (e) {
    console.error("[sla] no se pudo registrar el envío:", e);
  }
}

/** Resumen de SLA por dependencia para un ejercicio (Gobernanza / Excel). */
export function slaPorDependencia(
  ctx: Ctx,
  anio: number,
): Promise<SlaDependenciaDTO[]> {
  return conTTL("sla", `${ctx.env}:${anio}`, TTL_CORTO, true, async () => {
    const periodo = await ctx.db.periodo.findFirst({
      where: { anio, tipo: "ANUAL", numero: null },
      select: { id: true },
    });
    if (!periodo) return [];
    const [filas, deps] = await Promise.all([
      ctx.db.slaCarga.findMany({ where: { periodoId: periodo.id } }),
      ctx.db.dependencia.findMany({ select: { id: true, nombre: true } }),
    ]);
    const nombre = new Map(deps.map((d) => [d.id, d.nombre]));

    const porDep = new Map<number, SlaDependenciaDTO>();
    for (const f of filas) {
      let r = porDep.get(f.dependenciaId);
      if (!r) {
        r = {
          dependenciaId: f.dependenciaId,
          dependencia: nombre.get(f.dependenciaId) ?? `Dependencia ${f.dependenciaId}`,
          envios: 0,
          enPlazo: 0,
          fueraDePlazo: 0,
          conProrroga: 0,
          puntualidad: null,
          atrasoPromedio: null,
          atrasoMaximo: null,
        };
        porDep.set(f.dependenciaId, r);
      }
      r.envios++;
      if (f.enPlazo) r.enPlazo++;
      else r.fueraDePlazo++;
      if (f.conProrroga) r.conProrroga++;
    }
    // Atrasos (solo envíos fuera de plazo con desvío conocido).
    const atrasos = new Map<number, number[]>();
    for (const f of filas) {
      if (f.enPlazo || f.diasDesvio === null) continue;
      const arr = atrasos.get(f.dependenciaId) ?? [];
      arr.push(f.diasDesvio);
      atrasos.set(f.dependenciaId, arr);
    }
    for (const r of porDep.values()) {
      r.puntualidad = r.envios > 0 ? r.enPlazo / r.envios : null;
      const arr = atrasos.get(r.dependenciaId);
      if (arr && arr.length > 0) {
        r.atrasoPromedio =
          Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
        r.atrasoMaximo = Math.max(...arr);
      }
    }
    return [...porDep.values()].sort((a, b) =>
      a.dependencia.localeCompare(b.dependencia, "es"),
    );
  });
}
