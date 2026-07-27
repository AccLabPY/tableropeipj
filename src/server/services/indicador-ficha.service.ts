import type { Ctx } from "@/server/db/env";
import { calcularCumplimiento, semaforo as clasificar } from "@/domain";
import {
  aprobadaVigente,
  deIndicador,
} from "@/server/repositories/medicion.repo";
import { ROLES_VISION_TOTAL, tieneRol } from "@/server/auth/guards";
import { noEncontrado } from "@/server/api/api-error";
import { ANIOS_PEI } from "@/shared/constants";
import { num } from "./mappers";
import { toMedicionResumen } from "./medicion-dto";
import { estadoPEI } from "./estado-cache";
import { catalogoIndicadores } from "./estado-pei.service";
import { conTTL, TTL_CORTO } from "./cache";
import type {
  IndicadorFichaDTO,
  MedicionResumenDTO,
  TrayectoriaAnioDTO,
} from "@/shared/dtos/indicador-ficha";

/**
 * Ficha completa del indicador. Camino caliente: catálogo + estado vienen de
 * caché (0 queries) y el DTO final también se cachea para los roles de visión
 * total (los actores con scoping por dependencia ven listas de mediciones
 * distintas → computan sin caché para no filtrar datos entre roles).
 */
export async function fichaIndicador(
  ctx: Ctx,
  codigo: number,
  anio: number,
): Promise<IndicadorFichaDTO> {
  const visionTotal = tieneRol(ctx.actor, ...ROLES_VISION_TOTAL);
  if (!visionTotal) return computarFicha(ctx, codigo, anio);
  return conTTL("ficha", `${ctx.env}:${codigo}:${anio}`, TTL_CORTO, true, () =>
    computarFicha(ctx, codigo, anio),
  );
}

async function computarFicha(
  ctx: Ctx,
  codigo: number,
  anio: number,
): Promise<IndicadorFichaDTO> {
  const [catalogo, estadoGeneral] = await Promise.all([
    catalogoIndicadores(ctx),
    estadoPEI(ctx, anio),
  ]);
  const ind = catalogo.find((i) => i.codigo === codigo);
  if (!ind) throw noEncontrado(`Indicador ${codigo}`);

  const estado = estadoGeneral.indicadores.find((e) => e.codigo === codigo);
  if (!estado) throw noEncontrado(`Estado del indicador ${codigo}`);

  const medicionesTodas = await deIndicador(ctx, ind.id);
  const umbral = { verde: estado.umbralVerde, amarillo: estado.umbralAmarillo };
  const lineaBase = num(ind.lineaBase);

  const trayectoria: TrayectoriaAnioDTO[] = ANIOS_PEI.map((a) => {
    const metaAnio = ind.metas.find((m) => m.anio === a);
    const meta = num(metaAnio?.valorMeta as never);
    const delAnio = medicionesTodas.filter((m) => m.periodo.anio === a);
    const aprobada = aprobadaVigente(delAnio);
    const valor = num(aprobada?.valorObservado as never);
    const r = calcularCumplimiento({
      base: lineaBase,
      meta,
      valor,
      sentido: ind.sentido,
      metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
    });
    return {
      anio: a,
      meta,
      metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
      valor,
      capado: r.capado,
      semaforo: valor === null && a > anio ? null : clasificar(r.capado, umbral),
    };
  });

  const mediciones: MedicionResumenDTO[] =
    medicionesTodas.map(toMedicionResumen);

  return {
    estado,
    descripcion: ind.descripcion,
    variables: ind.variables,
    formula: ind.formula,
    ambito: ind.ambito,
    frecuencia: ind.frecuencia,
    cobertura: ind.cobertura,
    anioLineaBase: ind.anioLineaBase,
    fuenteInfo: ind.fuenteInfo,
    comentarios: ind.comentarios,
    aeNombre: ind.ae?.nombre ?? null,
    oeNombre: ind.oe.nombre,
    trayectoria,
    escala: ind.escala.map((e) => ({
      nivel: e.nivel,
      descripcion: e.descripcion,
      pctMin: num(e.pctMin)!,
      pctMax: num(e.pctMax)!,
    })),
    responsables: ind.responsables.map((r) => ({
      dependenciaId: r.dependenciaId,
      nombre: r.dependencia.nombre,
      rol: r.rol,
    })),
    mediciones,
  };
}
