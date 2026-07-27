import { describe, expect, it } from "vitest";
import {
  ESTADOS_EDITABLES,
  puedeTransicionar,
  transicionesDesde,
  validarTransicion,
} from "../estados";
import { nivelDePct, pctDeNivel } from "../escala";

describe("máquina de estados del workflow", () => {
  it("flujo feliz: BORRADOR→ENVIADO→EN_REVISION→APROBADO", () => {
    expect(puedeTransicionar("BORRADOR", "ENVIADO")).toBe(true);
    expect(puedeTransicionar("ENVIADO", "EN_REVISION")).toBe(true);
    expect(puedeTransicionar("EN_REVISION", "APROBADO")).toBe(true);
  });

  it("OBSERVADO vuelve a ENVIADO; APROBADO solo puede RECTIFICARSE", () => {
    expect(transicionesDesde("OBSERVADO")).toEqual(["ENVIADO"]);
    expect(transicionesDesde("APROBADO")).toEqual(["RECTIFICADO"]);
    expect(transicionesDesde("RECHAZADO")).toEqual([]);
    expect(transicionesDesde("RECTIFICADO")).toEqual([]);
  });

  it("transiciones inválidas se rechazan", () => {
    expect(puedeTransicionar("BORRADOR", "APROBADO")).toBe(false);
    expect(puedeTransicionar("APROBADO", "BORRADOR")).toBe(false);
    expect(
      validarTransicion("BORRADOR", "APROBADO", ["ADMIN"]).error,
    ).toBe("TRANSICION_INVALIDA");
  });

  it("RBAC de transición: la dependencia no puede aprobar", () => {
    expect(
      validarTransicion("ENVIADO", "APROBADO", ["DEPENDENCIA_CARGA"]).error,
    ).toBe("ROL_NO_AUTORIZADO");
    expect(
      validarTransicion("ENVIADO", "APROBADO", ["DGPD_VALIDADOR"]).ok,
    ).toBe(true);
    expect(
      validarTransicion("BORRADOR", "ENVIADO", ["DEPENDENCIA_CARGA"]).ok,
    ).toBe(true);
    expect(
      validarTransicion("BORRADOR", "ENVIADO", ["CONSULTA"]).error,
    ).toBe("ROL_NO_AUTORIZADO");
  });

  it("solo BORRADOR y OBSERVADO son editables por la dependencia", () => {
    expect(ESTADOS_EDITABLES).toEqual(["BORRADOR", "OBSERVADO"]);
  });
});

describe("escala nivel→%", () => {
  const escala = [
    { nivel: 1, pctMin: 0, pctMax: 25 },
    { nivel: 2, pctMin: 26, pctMax: 50 },
    { nivel: 3, pctMin: 51, pctMax: 75 },
    { nivel: 4, pctMin: 76, pctMax: 100 },
  ];

  it("el % del nivel es su cota superior (pctMax)", () => {
    expect(pctDeNivel(escala, 2)).toBe(50);
    expect(pctDeNivel(escala, 4)).toBe(100);
  });

  it("nivel inexistente o null ⇒ null", () => {
    expect(pctDeNivel(escala, 9)).toBeNull();
    expect(pctDeNivel(escala, null)).toBeNull();
  });

  it("nivelDePct hace el mapeo inverso", () => {
    expect(nivelDePct(escala, 50)?.nivel).toBe(2);
    expect(nivelDePct(escala, 60)?.nivel).toBe(3);
  });
});
