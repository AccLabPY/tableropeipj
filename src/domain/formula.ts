/**
 * Motor de fórmulas de indicadores: mapea las variables base (a, b, c… /
 * nivel / valor absoluto) y calcula el valor observado automáticamente.
 *
 * La tipología está VALIDADA contra el dataset canónico de los 89 indicadores:
 *   75× "(a) / (b) * 100"  (31 de ellas reportan por nivel de escala)
 *    2× "(a) / (b)"            (3101 resolución, 3103 pendencia)
 *    1× "((a) + (b)) / (c)"    (3102 congestión)
 *   11× sumas / puntajes / índice → valor directo
 *
 * Módulo de dominio PURO: lo comparten el formulario de Registro (cálculo en
 * vivo) y el backend (que SIEMPRE recalcula — nunca confía en el cliente).
 */

export type TipoCalculo =
  | "RAZON_PORCENTAJE" // (a / b) * 100
  | "RAZON" // a / b
  | "SUMA_RAZON" // (a + b) / c
  | "VALOR_DIRECTO" // sumas, puntajes, índices: una sola variable
  | "NIVEL_ESCALA"; // reporta nivel cualitativo → % (ver escala.ts)

export interface VariableDef {
  /** "a" | "b" | "c" | "valor" (valor directo). */
  clave: string;
  /** Descripción breve para mostrar en el formulario de carga. */
  descripcion: string;
}

/** Clasifica la fórmula textual del indicador en un tipo computable. */
export function clasificarFormula(
  formula: string | null,
  esEscala: boolean,
): TipoCalculo {
  if (esEscala) return "NIVEL_ESCALA";
  const f = (formula ?? "").replace(/\s+/g, "");
  if (f.includes("((a)+(b))/(c)")) return "SUMA_RAZON";
  if (f.includes("(a)/(b)*100")) return "RAZON_PORCENTAJE";
  if (f.includes("(a)/(b)")) return "RAZON";
  return "VALOR_DIRECTO";
}

/** Claves de variables que exige cada tipo (escala se maneja con el nivel). */
export function variablesRequeridas(tipo: TipoCalculo): string[] {
  switch (tipo) {
    case "SUMA_RAZON":
      return ["a", "b", "c"];
    case "RAZON_PORCENTAJE":
    case "RAZON":
      return ["a", "b"];
    case "VALOR_DIRECTO":
      return ["valor"];
    case "NIVEL_ESCALA":
      return [];
  }
}

/**
 * Parsea el texto de variables de la ficha a definiciones estructuradas.
 * Tolera los dos formatos reales de las fichas:
 *   "(a) desc | (b) desc"        (separador pipe)
 *   "(a) desc +\n(b) desc /\n( c ) desc"  (multilínea, espacios en la clave y
 *                                          operadores colgantes de la fórmula)
 * Para VALOR_DIRECTO, el propio texto es la descripción de la única variable.
 */
export function parsearVariables(
  variables: string | null,
  tipo: TipoCalculo,
): VariableDef[] {
  const texto = (variables ?? "").trim();
  if (tipo === "NIVEL_ESCALA") return [];
  if (tipo === "VALOR_DIRECTO") {
    return [
      {
        clave: "valor",
        descripcion: texto.replace(/\s+/g, " ") || "Valor observado del período",
      },
    ];
  }
  const defs: VariableDef[] = [];
  for (const parte of texto.split(/\r?\n|\|/)) {
    const m = parte.trim().match(/^\(\s*([a-z])\s*\)\s*(.+)$/i);
    if (m) {
      const descripcion = m[2]
        .trim()
        .replace(/\s*[+/*\-]\s*$/, "") // operador de la fórmula colgando al final
        .trim();
      defs.push({ clave: m[1].toLowerCase(), descripcion });
    }
  }
  // Fallback: si la ficha no trae descripciones, generar las requeridas.
  const requeridas = variablesRequeridas(tipo);
  for (const clave of requeridas) {
    if (!defs.some((d) => d.clave === clave)) {
      defs.push({ clave, descripcion: `Variable (${clave})` });
    }
  }
  return defs
    .filter((d) => requeridas.includes(d.clave))
    .sort((x, y) => x.clave.localeCompare(y.clave));
}

export interface ResultadoFormula {
  valor: number | null;
  error?: "VARIABLE_FALTANTE" | "DENOMINADOR_CERO";
}

/**
 * Calcula el valor observado a partir de las variables base.
 * (NIVEL_ESCALA no pasa por acá: usa pctDeNivel de escala.ts.)
 */
export function calcularValorObservado(
  tipo: TipoCalculo,
  valores: Record<string, number | null | undefined>,
): ResultadoFormula {
  const v = (clave: string) => {
    const x = valores[clave];
    return x === null || x === undefined || Number.isNaN(x) ? null : x;
  };
  switch (tipo) {
    case "RAZON_PORCENTAJE": {
      const a = v("a");
      const b = v("b");
      if (a === null || b === null)
        return { valor: null, error: "VARIABLE_FALTANTE" };
      if (b === 0) return { valor: null, error: "DENOMINADOR_CERO" };
      return { valor: (a / b) * 100 };
    }
    case "RAZON": {
      const a = v("a");
      const b = v("b");
      if (a === null || b === null)
        return { valor: null, error: "VARIABLE_FALTANTE" };
      if (b === 0) return { valor: null, error: "DENOMINADOR_CERO" };
      return { valor: a / b };
    }
    case "SUMA_RAZON": {
      const a = v("a");
      const b = v("b");
      const c = v("c");
      if (a === null || b === null || c === null)
        return { valor: null, error: "VARIABLE_FALTANTE" };
      if (c === 0) return { valor: null, error: "DENOMINADOR_CERO" };
      return { valor: (a + b) / c };
    }
    case "VALOR_DIRECTO": {
      const valor = v("valor");
      if (valor === null) return { valor: null, error: "VARIABLE_FALTANTE" };
      return { valor };
    }
    case "NIVEL_ESCALA":
      return { valor: null, error: "VARIABLE_FALTANTE" };
  }
}

/** Fórmula legible para la caja "Cómo se calcula" del formulario. */
export function formulaLegible(
  tipo: TipoCalculo,
  formula: string | null,
): string {
  switch (tipo) {
    case "RAZON_PORCENTAJE":
      return "( (a) ÷ (b) ) × 100";
    case "RAZON":
      return "(a) ÷ (b)";
    case "SUMA_RAZON":
      return "( (a) + (b) ) ÷ (c)";
    case "NIVEL_ESCALA":
      return "El % del nivel alcanzado en la escala del indicador";
    case "VALOR_DIRECTO":
      return formula ?? "Valor reportado directamente";
  }
}
