import { describe, expect, it } from "vitest";
import {
  ESTADOS_EDITABLES,
  puedeTransicionar,
  transicionesDesde,
  validarTransicion,
} from "../estados";
import { nivelAlcanzado, nivelDePct, pctDeNivel } from "../escala";

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

describe("nivel alcanzado con % editable (convención 2026)", () => {
  const escala = [
    { nivel: 0, pctMin: 0, pctMax: 0 }, // Preparativos
    { nivel: 1, pctMin: 0, pctMax: 20 },
    { nivel: 2, pctMin: 20, pctMax: 40 },
    { nivel: 3, pctMin: 40, pctMax: 60 },
    { nivel: 4, pctMin: 60, pctMax: 80 },
    { nivel: 5, pctMin: 80, pctMax: 100 },
  ];

  it("35% alcanza el nivel 1 (superó 20, no llegó a 40)", () => {
    expect(nivelAlcanzado(escala, 35)?.nivel).toBe(1);
  });

  it("las cotas exactas alcanzan su nivel", () => {
    expect(nivelAlcanzado(escala, 20)?.nivel).toBe(1);
    expect(nivelAlcanzado(escala, 40)?.nivel).toBe(2);
    expect(nivelAlcanzado(escala, 100)?.nivel).toBe(5);
  });

  it("por debajo del primer umbral queda en nivel 0 (preparativos)", () => {
    expect(nivelAlcanzado(escala, 0)?.nivel).toBe(0);
    expect(nivelAlcanzado(escala, 15)?.nivel).toBe(0);
  });

  it("sin nivel 0 y por debajo del primer umbral no alcanza ninguno", () => {
    const sinCero = escala.filter((e) => e.nivel !== 0);
    expect(nivelAlcanzado(sinCero, 15)).toBeNull();
    expect(nivelAlcanzado(sinCero, 20)?.nivel).toBe(1);
  });

  it("null o escala vacía devuelven null", () => {
    expect(nivelAlcanzado(escala, null)).toBeNull();
    expect(nivelAlcanzado([], 50)).toBeNull();
  });
});
