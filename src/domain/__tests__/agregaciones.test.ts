import { describe, expect, it } from "vitest";
import {
  avanceAE,
  avanceOE,
  cobertura,
  distribucionSemaforo,
  indicePEI,
  promedioPonderado,
} from "../agregaciones";

describe("agregaciones AE/OE/PEI + cobertura", () => {
  it("promedio ponderado excluye nulls (no valen 0)", () => {
    expect(
      promedioPonderado([
        { capado: 1, peso: 1 },
        { capado: 0.5, peso: 1 },
        { capado: null, peso: 1 },
      ]),
    ).toBeCloseTo(0.75, 4);
  });

  it("promedio ponderado respeta pesos", () => {
    expect(
      promedioPonderado([
        { capado: 1, peso: 3 },
        { capado: 0, peso: 1 },
      ]),
    ).toBeCloseTo(0.75, 4);
  });

  it("sin datos ⇒ null (no 0)", () => {
    expect(promedioPonderado([{ capado: null }])).toBeNull();
    expect(promedioPonderado([])).toBeNull();
    expect(avanceAE([])).toBeNull();
  });

  it("avance OE = promedio simple de AE con dato", () => {
    expect(avanceOE([0.8, null, 0.4])).toBeCloseTo(0.6, 4);
    expect(avanceOE([null, null])).toBeNull();
  });

  it("índice PEI = promedio ponderado de OE", () => {
    expect(
      indicePEI([
        { avance: 0.9 },
        { avance: 0.5 },
        { avance: null },
      ]),
    ).toBeCloseTo(0.7, 4);
  });

  it("cobertura aprobadas/esperadas; esperadas 0 ⇒ 0", () => {
    expect(cobertura(8, 10).fraccion).toBeCloseTo(0.8, 4);
    expect(cobertura(0, 0).fraccion).toBe(0);
  });

  it("distribución de semáforo cuenta por color", () => {
    expect(
      distribucionSemaforo(["VERDE", "VERDE", "ROJO", "GRIS"]),
    ).toEqual({ VERDE: 2, AMARILLO: 0, ROJO: 1, GRIS: 1 });
  });
});
