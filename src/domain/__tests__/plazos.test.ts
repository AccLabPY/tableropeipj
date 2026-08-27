import { describe, expect, it } from "vitest";
import {
  reglaAplica,
  resolverVentana,
  umbralAviso,
  type ContextoVentana,
  type ReglaVentana,
} from "../plazos";

const CTX: ContextoVentana = {
  indicadorCodigo: 4202,
  aeCodigo: "A.E.4.2",
  oeCodigo: "OE4",
  dependenciaIds: [14, 7],
};

const AHORA = new Date("2026-06-15T12:00:00Z");
const d = (iso: string) => new Date(iso);

function regla(p: Partial<ReglaVentana>): ReglaVentana {
  return {
    scope: "GLOBAL",
    entidad: "GLOBAL",
    tipo: "PLAZO",
    fechaLimite: null,
    motivo: null,
    creadoEn: d("2026-01-01T00:00:00Z"),
    ...p,
  };
}

describe("alcance de las reglas de ventana", () => {
  it("GLOBAL aplica siempre; OE/AE/INDICADOR/DEPENDENCIA por coincidencia", () => {
    expect(reglaAplica(regla({}), CTX)).toBe(true);
    expect(reglaAplica(regla({ scope: "OE", entidad: "OE4" }), CTX)).toBe(true);
    expect(reglaAplica(regla({ scope: "OE", entidad: "OE1" }), CTX)).toBe(false);
    expect(reglaAplica(regla({ scope: "AE", entidad: "A.E.4.2" }), CTX)).toBe(true);
    expect(reglaAplica(regla({ scope: "INDICADOR", entidad: "4202" }), CTX)).toBe(true);
    expect(reglaAplica(regla({ scope: "INDICADOR", entidad: "1101" }), CTX)).toBe(false);
    expect(reglaAplica(regla({ scope: "DEPENDENCIA", entidad: "14" }), CTX)).toBe(true);
    expect(reglaAplica(regla({ scope: "DEPENDENCIA", entidad: "99" }), CTX)).toBe(false);
  });

  it("AE no aplica a indicadores de nivel OE (aeCodigo null)", () => {
    const ctxOE = { ...CTX, aeCodigo: null };
    expect(reglaAplica(regla({ scope: "AE", entidad: "A.E.4.2" }), ctxOE)).toBe(false);
  });
});

describe("resolución de la ventana de carga", () => {
  it("sin fecha ni actos: la carga está abierta", () => {
    const v = resolverVentana([], CTX, { fechaLimitePeriodo: null, ahora: AHORA });
    expect(v.estado).toBe("ABIERTA");
    expect(v.fechaLimite).toBeNull();
    expect(v.diasRestantes).toBeNull();
  });

  it("plazo del período vigente: abierta con días restantes", () => {
    const v = resolverVentana([], CTX, {
      fechaLimitePeriodo: d("2026-06-25T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.estado).toBe("ABIERTA");
    expect(v.diasRestantes).toBe(11);
    expect(v.origen).toBe("PERIODO");
  });

  it("plazo del período vencido: cierra por vencimiento (no manual)", () => {
    const v = resolverVentana([], CTX, {
      fechaLimitePeriodo: d("2026-05-31T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.estado).toBe("CERRADA");
    expect(v.cierreManual).toBe(false);
    expect(v.diasRestantes).toBeLessThan(0);
  });

  it("una prórroga posterior extiende el plazo vencido y reabre", () => {
    const reglas = [
      regla({
        scope: "DEPENDENCIA",
        entidad: "14",
        tipo: "PRORROGA",
        fechaLimite: d("2026-07-31T23:59:59Z"),
        motivo: "Cambio de referente",
        creadoEn: d("2026-06-01T00:00:00Z"),
      }),
    ];
    const v = resolverVentana(reglas, CTX, {
      fechaLimitePeriodo: d("2026-05-31T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.estado).toBe("ABIERTA");
    expect(v.conProrroga).toBe(true);
    expect(v.origen).toBe("DEPENDENCIA");
    expect(v.motivo).toBe("Cambio de referente");
  });

  it("una prórroga nunca acorta el plazo vigente (gana la fecha más tardía)", () => {
    const reglas = [
      regla({
        scope: "INDICADOR",
        entidad: "4202",
        tipo: "PRORROGA",
        fechaLimite: d("2026-06-20T23:59:59Z"),
        creadoEn: d("2026-06-10T00:00:00Z"),
      }),
    ];
    const v = resolverVentana(reglas, CTX, {
      fechaLimitePeriodo: d("2026-08-31T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.fechaLimite?.toISOString()).toBe(d("2026-08-31T23:59:59Z").toISOString());
    expect(v.conProrroga).toBe(false);
  });

  it("un cierre manual manda aunque el plazo siga vigente", () => {
    const reglas = [
      regla({
        scope: "INDICADOR",
        entidad: "4202",
        tipo: "CIERRE",
        motivo: "Cierre anticipado por corte de datos",
        creadoEn: d("2026-06-10T00:00:00Z"),
      }),
    ];
    const v = resolverVentana(reglas, CTX, {
      fechaLimitePeriodo: d("2026-12-31T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.estado).toBe("CERRADA");
    expect(v.cierreManual).toBe(true);
    expect(v.motivo).toBe("Cierre anticipado por corte de datos");
  });

  it("una apertura posterior al cierre reabre la carga", () => {
    const reglas = [
      regla({ scope: "GLOBAL", entidad: "GLOBAL", tipo: "CIERRE", creadoEn: d("2026-06-01T00:00:00Z") }),
      regla({
        scope: "DEPENDENCIA",
        entidad: "14",
        tipo: "APERTURA",
        motivo: "Habilitación excepcional",
        creadoEn: d("2026-06-12T00:00:00Z"),
      }),
    ];
    const v = resolverVentana(reglas, CTX, {
      fechaLimitePeriodo: d("2026-05-31T23:59:59Z"),
      ahora: AHORA,
    });
    expect(v.estado).toBe("ABIERTA");
    expect(v.motivo).toBe("Habilitación excepcional");
  });

  it("un cierre posterior a la apertura vuelve a bloquear", () => {
    const reglas = [
      regla({ scope: "DEPENDENCIA", entidad: "14", tipo: "APERTURA", creadoEn: d("2026-06-01T00:00:00Z") }),
      regla({ scope: "GLOBAL", entidad: "GLOBAL", tipo: "CIERRE", creadoEn: d("2026-06-11T00:00:00Z") }),
    ];
    const v = resolverVentana(reglas, CTX, { fechaLimitePeriodo: null, ahora: AHORA });
    expect(v.estado).toBe("CERRADA");
    expect(v.cierreManual).toBe(true);
  });

  it("ignora reglas de otro OE/indicador", () => {
    const reglas = [
      regla({ scope: "OE", entidad: "OE1", tipo: "CIERRE", creadoEn: d("2026-06-14T00:00:00Z") }),
    ];
    const v = resolverVentana(reglas, CTX, { fechaLimitePeriodo: null, ahora: AHORA });
    expect(v.estado).toBe("ABIERTA");
  });
});

describe("umbral de aviso de vencimiento", () => {
  const base = { fechaLimitePeriodo: null, ahora: AHORA };
  it("avisa a 7 y a 1 día; no antes ni después del vencimiento", () => {
    const conDias = (dias: number) =>
      resolverVentana([], CTX, {
        ...base,
        fechaLimitePeriodo: new Date(AHORA.getTime() + dias * 86_400_000),
      });
    expect(umbralAviso(conDias(10))).toBeNull();
    expect(umbralAviso(conDias(6))).toBe(7);
    expect(umbralAviso(conDias(0.5))).toBe(1);
    expect(umbralAviso(conDias(-2))).toBeNull(); // vencida ⇒ cerrada
  });
});
