import { describe, expect, it } from "vitest";
import { semaforo } from "../semaforo";
import {
  claveUmbral,
  origenUmbral,
  pctAUmbral,
  resolverUmbral,
  umbralEfectivo,
  UMBRAL_GLOBAL_DEFAULT,
} from "../umbrales";
import type { Umbral } from "../types";

describe("umbrales configurables con herencia", () => {
  const GLOBAL: Umbral = { verde: 0.9, amarillo: 0.7 };

  it("herencia: lo específico prevalece (Indicador → AE → OE → Global)", () => {
    const oe: Umbral = { verde: 0.85, amarillo: 0.65 };
    const ae: Umbral = { verde: 0.8, amarillo: 0.6 };
    const ind: Umbral = { verde: 0.95, amarillo: 0.75 };

    expect(umbralEfectivo({ GLOBAL })).toEqual(GLOBAL);
    expect(umbralEfectivo({ OE: oe, GLOBAL })).toEqual(oe);
    expect(umbralEfectivo({ AE: ae, OE: oe, GLOBAL })).toEqual(ae);
    expect(umbralEfectivo({ INDICADOR: ind, AE: ae, OE: oe, GLOBAL })).toEqual(
      ind,
    );
  });

  it("pctAUmbral convierte % de DB a fracciones", () => {
    expect(pctAUmbral({ verde: 90, amarillo: 70, azul: 110 })).toEqual({
      verde: 0.9,
      amarillo: 0.7,
      azul: 1.1,
    });
  });

  it("resolverUmbral usa el registro por clave SCOPE:entidad", () => {
    const registro = new Map<string, Umbral>([
      [claveUmbral("GLOBAL", "GLOBAL"), GLOBAL],
      [claveUmbral("OE", "OE3"), { verde: 0.85, amarillo: 0.65 }],
      [claveUmbral("AE", "A.E.3.2"), { verde: 0.8, amarillo: 0.6 }],
    ]);
    // 3201 pertenece a A.E.3.2 (OE3) → hereda de la AE
    const u3201 = resolverUmbral(registro, {
      indicadorCodigo: 3201,
      aeCodigo: "A.E.3.2",
      oeCodigo: "OE3",
    });
    expect(u3201).toEqual({ verde: 0.8, amarillo: 0.6 });
    expect(
      origenUmbral(registro, {
        indicadorCodigo: 3201,
        aeCodigo: "A.E.3.2",
        oeCodigo: "OE3",
      }),
    ).toBe("AE");
    // 3101 pertenece a A.E.3.1 (sin umbral propio) → hereda del OE3
    const u3101 = resolverUmbral(registro, {
      indicadorCodigo: 3101,
      aeCodigo: "A.E.3.1",
      oeCodigo: "OE3",
    });
    expect(u3101).toEqual({ verde: 0.85, amarillo: 0.65 });
    // 1101 (OE1, sin overrides) → global
    const u1101 = resolverUmbral(registro, {
      indicadorCodigo: 1101,
      aeCodigo: "A.E.1.1",
      oeCodigo: "OE1",
    });
    expect(u1101).toEqual(GLOBAL);
  });

  it("cambiar el umbral efectivo recalcula el color con el mismo capado", () => {
    // 3201 ⇒ 80%: AMARILLO con global 90/70, VERDE con umbral AE 80/60
    expect(semaforo(0.8, GLOBAL)).toBe("AMARILLO");
    expect(semaforo(0.8, { verde: 0.8, amarillo: 0.6 })).toBe("VERDE");
    expect(semaforo(0.8, { verde: 0.95, amarillo: 0.85 })).toBe("ROJO");
  });

  it("registro sin GLOBAL cae al default 90/70", () => {
    const u = resolverUmbral(new Map(), {
      indicadorCodigo: 1101,
      aeCodigo: null,
      oeCodigo: "OE1",
    });
    expect(u).toEqual(UMBRAL_GLOBAL_DEFAULT);
  });
});
