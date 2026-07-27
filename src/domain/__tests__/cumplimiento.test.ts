import { describe, expect, it } from "vitest";
import { calcularCumplimiento } from "../cumplimiento";
import { semaforo } from "../semaforo";

/**
 * Tests GOLDEN del §6 del prompt maestro — deben pasar exactamente.
 * "Prueba de oro": si 4202 da 97.5% o 3201 da 99%, la fórmula usó valor/meta
 * y está MAL.
 */
describe("motor de cumplimiento (fórmula canónica normalizada)", () => {
  it("4202: base 18.87, meta 20, valor 19.5, ASC ⇒ ~55.7% ROJO (NO 97.5%)", () => {
    const r = calcularCumplimiento({
      base: 18.87,
      meta: 20,
      valor: 19.5,
      sentido: "ASC",
    });
    expect(r.estado).toBe("OK");
    // (19.5 − 18.87) / (20 − 18.87) = 0.63/1.13 ≈ 0.5575 (~55.7%)
    expect(r.capado).toBeCloseTo(0.5575, 3);
    expect(r.capado! * 100).toBeCloseTo(55.75, 1);
    expect(semaforo(r.capado)).toBe("ROJO");
  });

  it("3201: base 100, meta 95, valor 96, DESC ⇒ 80% AMARILLO (NO 99%)", () => {
    const r = calcularCumplimiento({
      base: 100,
      meta: 95,
      valor: 96,
      sentido: "DESC",
    });
    expect(r.capado).toBeCloseTo(0.8, 3);
    expect(semaforo(r.capado)).toBe("AMARILLO");
  });

  it("línea base pendiente (null) ⇒ PENDIENTE_BASE y semáforo GRIS", () => {
    const r = calcularCumplimiento({
      base: null,
      meta: 1.05,
      valor: null,
      sentido: "ASC",
    });
    expect(r.estado).toBe("PENDIENTE_BASE");
    expect(r.capado).toBeNull();
    expect(semaforo(r.capado)).toBe("GRIS");
  });

  it("mantenimiento meta=base ASC con V≥M ⇒ 1", () => {
    const r = calcularCumplimiento({
      base: 400,
      meta: 400,
      valor: 400,
      sentido: "ASC",
    });
    expect(r.capado).toBe(1);
  });

  it("mantenimiento meta=base ASC con V<M ⇒ V/M", () => {
    const r = calcularCumplimiento({
      base: 400,
      meta: 400,
      valor: 300,
      sentido: "ASC",
    });
    expect(r.capado).toBeCloseTo(0.75, 4);
  });

  it("DESC con base=meta: V≤M ⇒ 1, V>M ⇒ 0", () => {
    expect(
      calcularCumplimiento({ base: 50, meta: 50, valor: 45, sentido: "DESC" })
        .capado,
    ).toBe(1);
    expect(
      calcularCumplimiento({ base: 50, meta: 50, valor: 55, sentido: "DESC" })
        .capado,
    ).toBe(0);
  });

  it("valor null con base definida ⇒ SIN_DATO", () => {
    const r = calcularCumplimiento({
      base: 0,
      meta: 10,
      valor: null,
      sentido: "ASC",
    });
    expect(r.estado).toBe("SIN_DATO");
    expect(semaforo(r.capado)).toBe("GRIS");
  });

  it("ciclo de vida (metaConcluida) ⇒ NO_APLICA", () => {
    const r = calcularCumplimiento({
      base: 0,
      meta: 0,
      valor: 100,
      sentido: "ASC",
      metaConcluida: true,
    });
    expect(r.estado).toBe("NO_APLICA");
    expect(r.capado).toBeNull();
  });

  it("meta 0 (sin ser ciclo de vida) ⇒ NO_APLICA", () => {
    const r = calcularCumplimiento({
      base: 5,
      meta: 0,
      valor: 3,
      sentido: "ASC",
    });
    expect(r.estado).toBe("NO_APLICA");
  });

  it("sobrecumplimiento: real > 1, capado acota a 1", () => {
    const r = calcularCumplimiento({
      base: 0,
      meta: 10,
      valor: 15,
      sentido: "ASC",
    });
    expect(r.real).toBeCloseTo(1.5, 4);
    expect(r.capado).toBe(1);
    expect(semaforo(r.capado)).toBe("VERDE");
  });

  it("retroceso bajo la base: real < 0, capado acota a 0", () => {
    const r = calcularCumplimiento({
      base: 50,
      meta: 100,
      valor: 40,
      sentido: "ASC",
    });
    expect(r.real).toBeLessThan(0);
    expect(r.capado).toBe(0);
    expect(semaforo(r.capado)).toBe("ROJO");
  });

  it("DESC 3102 (congestión): base 6.5, meta 6.25, valor 6.3 ⇒ 80%", () => {
    const r = calcularCumplimiento({
      base: 6.5,
      meta: 6.25,
      valor: 6.3,
      sentido: "DESC",
    });
    expect(r.capado).toBeCloseTo(0.8, 3);
  });
});
