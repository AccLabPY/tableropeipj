/**
 * Ventanas de carga: plazos, prórrogas y aperturas/cierres manuales.
 *
 * Reglas institucionales (§ observaciones DGPD 2026):
 *  - La carga de un indicador está ABIERTA mientras no exista una fecha límite
 *    vencida ni un cierre manual vigente. Sin fecha definida ⇒ abierta.
 *  - La fecha límite efectiva es la MÁS TARDÍA entre el plazo del período y
 *    los PLAZO/PRORROGA aplicables (GLOBAL, OE, AE, INDICADOR, DEPENDENCIA):
 *    una prórroga nunca puede acortar un plazo ya otorgado.
 *  - Un acto manual posterior (APERTURA/CIERRE) manda sobre el cálculo por
 *    fecha: la DGPD puede cerrar antes del vencimiento o reabrir después.
 *  - El cierre bloquea SOLO a las dependencias; DGPD/Admin siempre pueden
 *    operar (eso se aplica en el service, no aquí).
 */

export type ScopeVentana = "GLOBAL" | "OE" | "AE" | "INDICADOR" | "DEPENDENCIA";
export type TipoVentana = "PLAZO" | "PRORROGA" | "APERTURA" | "CIERRE";

export interface ReglaVentana {
  scope: ScopeVentana;
  /** "GLOBAL" | "OE1" | "A.E.1.1" | "4202" | id de dependencia como texto. */
  entidad: string;
  tipo: TipoVentana;
  fechaLimite: Date | null;
  motivo: string | null;
  creadoEn: Date;
}

/** Datos del indicador necesarios para saber qué reglas le aplican. */
export interface ContextoVentana {
  indicadorCodigo: number;
  aeCodigo: string | null;
  oeCodigo: string;
  /** Dependencias responsables del indicador (principal + corresponsables). */
  dependenciaIds: number[];
}

export interface VentanaEfectiva {
  estado: "ABIERTA" | "CERRADA";
  fechaLimite: Date | null;
  /** Días hasta el vencimiento (negativo = vencido); null sin fecha. */
  diasRestantes: number | null;
  /** true si la fecha vigente proviene de una prórroga. */
  conProrroga: boolean;
  /** true si el cierre proviene de un acto manual, no del vencimiento. */
  cierreManual: boolean;
  motivo: string | null;
  origen: ScopeVentana | "PERIODO" | null;
}

const DIA_MS = 86_400_000;

/** ¿La regla aplica a este indicador? */
export function reglaAplica(r: ReglaVentana, ctx: ContextoVentana): boolean {
  switch (r.scope) {
    case "GLOBAL":
      return true;
    case "OE":
      return r.entidad === ctx.oeCodigo;
    case "AE":
      return ctx.aeCodigo !== null && r.entidad === ctx.aeCodigo;
    case "INDICADOR":
      return r.entidad === String(ctx.indicadorCodigo);
    case "DEPENDENCIA":
      return ctx.dependenciaIds.some((id) => String(id) === r.entidad);
    default:
      return false;
  }
}

/** Días restantes (redondeo hacia arriba: el día del vencimiento cuenta). */
export function diasHasta(limite: Date, ahora: Date): number {
  return Math.ceil((limite.getTime() - ahora.getTime()) / DIA_MS);
}

/**
 * Resuelve la ventana de carga vigente de un indicador.
 * `fechaLimitePeriodo` es el plazo por defecto del período (Periodo.fechaLimiteCarga).
 */
export function resolverVentana(
  reglas: ReglaVentana[],
  ctx: ContextoVentana,
  opts: { fechaLimitePeriodo: Date | null; ahora: Date },
): VentanaEfectiva {
  const aplicables = reglas.filter((r) => reglaAplica(r, ctx));

  // 1) Fecha límite efectiva: la más tardía entre período y PLAZO/PRORROGA.
  let fechaLimite: Date | null = opts.fechaLimitePeriodo;
  let origen: VentanaEfectiva["origen"] = fechaLimite ? "PERIODO" : null;
  let conProrroga = false;
  let motivo: string | null = null;

  for (const r of aplicables) {
    if (r.tipo !== "PLAZO" && r.tipo !== "PRORROGA") continue;
    if (!r.fechaLimite) continue;
    if (fechaLimite === null || r.fechaLimite.getTime() > fechaLimite.getTime()) {
      fechaLimite = r.fechaLimite;
      origen = r.scope;
      conProrroga = r.tipo === "PRORROGA";
      motivo = r.motivo;
    }
  }

  // 2) Acto manual más reciente (APERTURA/CIERRE) — manda sobre la fecha.
  const manuales = aplicables
    .filter((r) => r.tipo === "APERTURA" || r.tipo === "CIERRE")
    .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  const ultimoManual = manuales[0];

  const diasRestantes = fechaLimite ? diasHasta(fechaLimite, opts.ahora) : null;

  if (ultimoManual?.tipo === "CIERRE") {
    return {
      estado: "CERRADA",
      fechaLimite,
      diasRestantes,
      conProrroga,
      cierreManual: true,
      motivo: ultimoManual.motivo ?? motivo,
      origen: ultimoManual.scope,
    };
  }
  if (ultimoManual?.tipo === "APERTURA") {
    return {
      estado: "ABIERTA",
      fechaLimite,
      diasRestantes,
      conProrroga,
      cierreManual: false,
      motivo: ultimoManual.motivo ?? motivo,
      origen: ultimoManual.scope,
    };
  }

  // 3) Sin actos manuales: decide la fecha.
  const vencida = fechaLimite !== null && opts.ahora.getTime() > fechaLimite.getTime();
  return {
    estado: vencida ? "CERRADA" : "ABIERTA",
    fechaLimite,
    diasRestantes,
    conProrroga,
    cierreManual: false,
    motivo,
    origen,
  };
}

/** Umbrales (en días) de los avisos de vencimiento, del más urgente al menos. */
export const AVISOS_DIAS = [1, 7] as const;

/**
 * ¿Corresponde avisar hoy por esta ventana? Devuelve el umbral MÁS URGENTE
 * alcanzado (1 antes que 7), o null si aún no toca o ya venció.
 */
export function umbralAviso(v: VentanaEfectiva): number | null {
  if (v.estado !== "ABIERTA" || v.diasRestantes === null) return null;
  if (v.diasRestantes < 0) return null;
  for (const d of AVISOS_DIAS) {
    if (v.diasRestantes <= d) return d;
  }
  return null;
}
