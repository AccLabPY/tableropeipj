import type { Ctx } from "@/server/db/env";
import {
  calcularCumplimiento,
  semaforo as clasificar,
  resolverUmbral,
  origenUmbral,
  avanceAE,
  avanceOE,
  indicePEI,
  cobertura,
  distribucionSemaforo,
} from "@/domain";
import type { EstadoWF, Semaforo } from "@/domain/types";
import {
  listarCompletos,
  type IndicadorCompleto,
} from "@/server/repositories/indicador.repo";
import {
  aprobadaVigente,
  delPeriodoLigero,
  ultimaVersion,
  type MedicionLigera,
} from "@/server/repositories/medicion.repo";
import { registroUmbrales } from "@/server/repositories/umbral.repo";
import { periodoAnual } from "@/server/repositories/periodo.repo";
import { conTTL, TTL_LARGO } from "./cache";
import { num } from "./mappers";
import type {
  AEEstadoDTO,
  EstadoPeiDTO,
  IndicadorEstadoDTO,
  OEEstadoDTO,
} from "@/shared/dtos/estado-pei";

/**
 * Catálogo completo de indicadores (89 filas + relaciones): es el query más
 * caro del sistema (~8 round-trips) y sus datos son casi estáticos — cacheado
 * con SWR; lo invalida la edición de la matriz.
 */
export function catalogoIndicadores(ctx: Ctx) {
  return conTTL("catalogo", ctx.env, TTL_LARGO, true, () =>
    listarCompletos(ctx),
  );
}

/** Registro de umbrales cacheado (lo invalida la edición de escalas). */
export function umbralesCached(ctx: Ctx) {
  return conTTL("umbrales", ctx.env, TTL_LARGO, true, () =>
    registroUmbrales(ctx),
  );
}

/**
 * Servicio central: computa el estado completo del PEI para un año.
 * INVARIANTES: solo mediciones APROBADAS alimentan el cumplimiento;
 * el cálculo usa el dominio puro (nunca SQL); cobertura siempre acompaña.
 * Con los cachés calientes cuesta 1 solo query (mediciones del período).
 */
export async function calcularEstadoPEI(
  ctx: Ctx,
  anio: number,
): Promise<EstadoPeiDTO> {
  const [indicadores, umbrales, periodo] = await Promise.all([
    catalogoIndicadores(ctx),
    umbralesCached(ctx),
    periodoAnual(ctx, anio),
  ]);
  const mediciones = await delPeriodoLigero(ctx, periodo.id);

  const porIndicador = new Map<number, MedicionLigera[]>();
  for (const m of mediciones) {
    const arr = porIndicador.get(m.indicadorId) ?? [];
    arr.push(m);
    porIndicador.set(m.indicadorId, arr);
  }

  const estados: IndicadorEstadoDTO[] = indicadores.map((ind) =>
    estadoDeIndicador(ind, anio, porIndicador.get(ind.id) ?? [], umbrales),
  );
  const porCodigo = new Map(estados.map((e) => [e.codigo, e]));

  // --- Agregación OE → AE → Indicador --------------------------------------
  type OeRel = IndicadorCompleto["oe"];
  type AeRel = NonNullable<IndicadorCompleto["ae"]>;
  const objetivos: OEEstadoDTO[] = [];
  const mapaOE = new Map<string, OeRel>(
    indicadores.map((i) => [i.oe.codigo, i.oe]),
  );
  const oesUnicos = [...mapaOE.values()].sort((a, b) =>
    a.codigo.localeCompare(b.codigo),
  );
  for (const oe of oesUnicos) {
    const mapaAE = new Map<string, AeRel>(
      indicadores
        .filter((i) => i.oe.codigo === oe.codigo && i.ae)
        .map((i) => [i.ae!.codigo, i.ae!]),
    );
    const aesDelOE = [...mapaAE.values()].sort((a, b) =>
      a.codigo.localeCompare(b.codigo, "es", { numeric: true }),
    );

    const acciones: AEEstadoDTO[] = aesDelOE.map((ae) => {
      const inds = estados.filter((e) => e.aeCodigo === ae.codigo);
      const avance = avanceAE(inds.map((i) => ({ capado: i.capado })));
      const umbral = resolverUmbral(umbrales, {
        indicadorCodigo: -1,
        aeCodigo: ae.codigo,
        oeCodigo: oe.codigo,
      });
      return {
        codigo: ae.codigo,
        nombre: ae.nombre,
        oeCodigo: oe.codigo,
        avance,
        semaforo: clasificar(avance, umbral),
        indicadores: inds,
      };
    });

    const avance = avanceOE(acciones.map((a) => a.avance));
    const umbralOE = resolverUmbral(umbrales, {
      indicadorCodigo: -1,
      aeCodigo: null,
      oeCodigo: oe.codigo,
    });
    const numero = Number(oe.codigo.replace("OE", ""));
    objetivos.push({
      codigo: oe.codigo,
      numero,
      nombre: oe.nombre,
      pnd: oe.pnd.map((p) => p.pnd.codigo),
      ods: oe.ods.map((o) => o.ods.numero),
      avance,
      semaforo: clasificar(avance, umbralOE),
      acciones,
      indicadorOE: porCodigo.get(numero) ?? null,
    });
  }

  // --- Índice PEI + cobertura + distribución -------------------------------
  const indice = indicePEI(objetivos.map((o) => ({ avance: o.avance })));
  const esperadas = estados.filter(
    (e) => e.meta !== null && !e.metaConcluida,
  ).length;
  const aprobadas = estados.filter(
    (e) => e.meta !== null && !e.metaConcluida && e.valor !== null,
  ).length;
  const dist = distribucionSemaforo(estados.map((e) => e.semaforo));

  return {
    anio,
    indicePEI: indice,
    cobertura: cobertura(aprobadas, esperadas),
    distribucion: dist,
    objetivos,
    indicadores: estados,
  };
}

function estadoDeIndicador(
  ind: IndicadorCompleto,
  anio: number,
  medicionesInd: { estado: string; version: number; valorObservado: unknown }[],
  umbrales: Awaited<ReturnType<typeof registroUmbrales>>,
): IndicadorEstadoDTO {
  const metaAnio = ind.metas.find((m) => m.anio === anio);
  const aprobada = aprobadaVigente(
    medicionesInd as { estado: EstadoWF; version: number; valorObservado: unknown }[],
  );
  const ultima = ultimaVersion(
    medicionesInd as { estado: EstadoWF; version: number }[],
  );

  const meta = num(metaAnio?.valorMeta as never);
  const valor = num((aprobada?.valorObservado ?? null) as never);
  const lineaBase = num(ind.lineaBase);

  const r = calcularCumplimiento({
    base: lineaBase,
    meta,
    valor,
    sentido: ind.sentido,
    metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
  });

  const ctxUmbral = {
    indicadorCodigo: ind.codigo,
    aeCodigo: ind.ae?.codigo ?? null,
    oeCodigo: ind.oe.codigo,
  };
  const umbral = resolverUmbral(umbrales, ctxUmbral);
  const sem: Semaforo = clasificar(r.capado, umbral);

  const respPrincipal =
    ind.responsables.find((x) => x.rol === "PRINCIPAL") ??
    ind.responsables[0] ??
    null;
  const principal = respPrincipal?.dependencia.nombre ?? "—";

  return {
    codigo: ind.codigo,
    nivel: ind.nivel,
    oeCodigo: ind.oe.codigo,
    aeCodigo: ind.ae?.codigo ?? null,
    nombre: ind.nombre,
    unidad: ind.unidad,
    sentido: ind.sentido,
    dimension: ind.dimension,
    lineaBase,
    basePendiente: ind.basePendiente,
    requiereDiagnostico: ind.requiereDiagnostico,
    esCicloVida: ind.esCicloVida,
    esEscala: ind.esEscala,
    meta,
    metaConcluida: metaAnio?.esPeriodoConcluido ?? false,
    valor,
    estadoMedicion: (ultima?.estado as EstadoWF | undefined) ?? null,
    real: r.real,
    capado: r.capado,
    estadoCumplimiento: r.estado,
    semaforo: sem,
    umbralVerde: umbral.verde,
    umbralAmarillo: umbral.amarillo,
    umbralOrigen: origenUmbral(umbrales, ctxUmbral),
    dependenciaPrincipal: principal,
    dependenciaPrincipalId: respPrincipal?.dependenciaId ?? null,
    dependenciaIds: ind.responsables.map((x) => x.dependenciaId),
  };
}
