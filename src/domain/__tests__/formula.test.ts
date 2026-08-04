import { describe, expect, it } from "vitest";
import {
  calcularValorObservado,
  clasificarFormula,
  formulaLegible,
  parsearVariables,
  variablesRequeridas,
} from "../formula";

describe("clasificador de fórmulas (contra strings reales del dataset)", () => {
  it("(a) / (b) * 100 → RAZON_PORCENTAJE (75 indicadores, ej. 1101/4202)", () => {
    expect(clasificarFormula("(a) / (b) * 100", false)).toBe(
      "RAZON_PORCENTAJE",
    );
  });
  it("esEscala tiene precedencia → NIVEL_ESCALA (ej. 2201 con (a)/(b)*100)", () => {
    expect(clasificarFormula("(a) / (b) * 100", true)).toBe("NIVEL_ESCALA");
  });
  it("(a) / (b) → RAZON (3101 resolución, 3103 pendencia)", () => {
    expect(clasificarFormula("(a) / (b)", false)).toBe("RAZON");
  });
  it("((a) + (b)) / (c) → SUMA_RAZON (3102 congestión)", () => {
    expect(clasificarFormula("((a) + (b)) / (c)", false)).toBe("SUMA_RAZON");
  });
  it("sumas y puntajes → VALOR_DIRECTO (1401, 1501, 4401, 5401)", () => {
    expect(
      clasificarFormula("Sumatoria de procedimientos operacionales aprobados", false),
    ).toBe("VALOR_DIRECTO");
    expect(
      clasificarFormula("Nivel de madurez = puntaje obtenido", false),
    ).toBe("VALOR_DIRECTO");
    expect(clasificarFormula("Índice = Puntaje obtenido", false)).toBe(
      "VALOR_DIRECTO",
    );
    expect(clasificarFormula(null, false)).toBe("VALOR_DIRECTO");
  });
});

describe("parseo de definiciones de variables", () => {
  it("dos variables (1101)", () => {
    expect(
      parsearVariables(
        "(a) Cantidad de normativas institucionales actualizadas | (b) Cantidad total del marco normativo",
        "RAZON_PORCENTAJE",
      ),
    ).toEqual([
      { clave: "a", descripcion: "Cantidad de normativas institucionales actualizadas" },
      { clave: "b", descripcion: "Cantidad total del marco normativo" },
    ]);
  });
  it("tres variables (3102)", () => {
    expect(
      parsearVariables(
        "(a) Casos pendientes al inicio del periodo | (b) Casos ingresados | (c) Casos resueltos en el periodo",
        "SUMA_RAZON",
      ),
    ).toHaveLength(3);
  });
  it("valor directo usa el texto como descripción (1401)", () => {
    expect(
      parsearVariables("Sumatoria de procedimientos aprobados", "VALOR_DIRECTO"),
    ).toEqual([
      { clave: "valor", descripcion: "Sumatoria de procedimientos aprobados" },
    ]);
  });
  it("fallback cuando la ficha no trae descripciones", () => {
    expect(parsearVariables(null, "RAZON_PORCENTAJE")).toEqual([
      { clave: "a", descripcion: "Variable (a)" },
      { clave: "b", descripcion: "Variable (b)" },
    ]);
  });
  it("escala no expone variables (usa el select de niveles)", () => {
    expect(parsearVariables("(a) Nivel | (b) Máximo", "NIVEL_ESCALA")).toEqual(
      [],
    );
  });
  it("formato data actualizada: multilínea con '( c )' y operadores colgantes (3102)", () => {
    expect(
      parsearVariables(
        "(a) Casos pendientes al inicio del periodo + \n(b) Casos ingresados / \n( c ) Casos resueltos en ese periodo",
        "SUMA_RAZON",
      ),
    ).toEqual([
      { clave: "a", descripcion: "Casos pendientes al inicio del periodo" },
      { clave: "b", descripcion: "Casos ingresados" },
      { clave: "c", descripcion: "Casos resueltos en ese periodo" },
    ]);
  });
  it("formato data actualizada: saltos de línea como separador (1101)", () => {
    expect(
      parsearVariables(
        "(a) Cantidad de normativas institucionales actualizadas\n(b) Cantidad total del marco normativo",
        "RAZON_PORCENTAJE",
      ),
    ).toHaveLength(2);
  });
  it("valor directo multilínea colapsa espacios (2302 nueva)", () => {
    const defs = parsearVariables(
      "Total de participantes en las capacitaciones\nTipo de capacitación (curso, taller, diplomado, etc.)\nCategoría del participante (magistrado o funcionario)",
      "VALOR_DIRECTO",
    );
    expect(defs).toHaveLength(1);
    expect(defs[0].descripcion).not.toContain("\n");
  });
});

describe("cálculo automático del valor observado", () => {
  it("RAZON_PORCENTAJE: 5102 con a=178, b=200 ⇒ 89", () => {
    expect(
      calcularValorObservado("RAZON_PORCENTAJE", { a: 178, b: 200 }).valor,
    ).toBeCloseTo(89, 6);
  });
  it("RAZON: 3101 con a=105000, b=100000 ⇒ 1.05", () => {
    expect(
      calcularValorObservado("RAZON", { a: 105000, b: 100000 }).valor,
    ).toBeCloseTo(1.05, 6);
  });
  it("SUMA_RAZON: 3102 con a=50000, b=75000, c=20000 ⇒ 6.25", () => {
    expect(
      calcularValorObservado("SUMA_RAZON", { a: 50000, b: 75000, c: 20000 })
        .valor,
    ).toBeCloseTo(6.25, 6);
  });
  it("VALOR_DIRECTO: 1401 con valor=65 ⇒ 65", () => {
    expect(calcularValorObservado("VALOR_DIRECTO", { valor: 65 }).valor).toBe(
      65,
    );
  });
  it("denominador cero ⇒ error DENOMINADOR_CERO", () => {
    expect(
      calcularValorObservado("RAZON_PORCENTAJE", { a: 10, b: 0 }).error,
    ).toBe("DENOMINADOR_CERO");
    expect(
      calcularValorObservado("SUMA_RAZON", { a: 1, b: 2, c: 0 }).error,
    ).toBe("DENOMINADOR_CERO");
  });
  it("variable faltante ⇒ error VARIABLE_FALTANTE", () => {
    expect(
      calcularValorObservado("RAZON_PORCENTAJE", { a: 10 }).error,
    ).toBe("VARIABLE_FALTANTE");
    expect(calcularValorObservado("VALOR_DIRECTO", {}).error).toBe(
      "VARIABLE_FALTANTE",
    );
  });
});

describe("metadatos para el formulario", () => {
  it("variables requeridas por tipo", () => {
    expect(variablesRequeridas("RAZON_PORCENTAJE")).toEqual(["a", "b"]);
    expect(variablesRequeridas("SUMA_RAZON")).toEqual(["a", "b", "c"]);
    expect(variablesRequeridas("VALOR_DIRECTO")).toEqual(["valor"]);
    expect(variablesRequeridas("NIVEL_ESCALA")).toEqual([]);
  });
  it("fórmula legible", () => {
    expect(formulaLegible("RAZON_PORCENTAJE", null)).toContain("× 100");
    expect(formulaLegible("SUMA_RAZON", null)).toBe("( (a) + (b) ) ÷ (c)");
  });
});
