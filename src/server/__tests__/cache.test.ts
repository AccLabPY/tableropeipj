import { describe, expect, it } from "vitest";
import { conTTL, invalidarEstadoPEI, invalidarStore } from "../services/cache";

function diferido<T>() {
  let resolver!: (v: T) => void;
  const p = new Promise<T>((r) => (resolver = r));
  return { p, resolver };
}

describe("caché con generación", () => {
  it("cachea y deduplica cálculos concurrentes", async () => {
    let llamadas = 0;
    const fn = async () => ++llamadas;
    const [a, b] = await Promise.all([
      conTTL("t-dedupe", "k", 60_000, false, fn),
      conTTL("t-dedupe", "k", 60_000, false, fn),
    ]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(await conTTL("t-dedupe", "k", 60_000, false, fn)).toBe(1);
  });

  it("un cálculo en vuelo durante una invalidación no se guarda", async () => {
    const viejo = diferido<string>();
    const p1 = conTTL("t-gen", "k", 60_000, false, () => viejo.p);
    invalidarEstadoPEI();
    viejo.resolver("previo a la mutación");
    expect(await p1).toBe("previo a la mutación");
    const v = await conTTL("t-gen", "k", 60_000, false, async () => "fresco");
    expect(v).toBe("fresco");
  });

  it("tras invalidar no reutiliza la promesa en vuelo anterior", async () => {
    const viejo = diferido<string>();
    void conTTL("t-inflight", "k", 60_000, false, () => viejo.p);
    invalidarStore("t-inflight");
    const nuevo = conTTL("t-inflight", "k", 60_000, false, async () => "nuevo");
    viejo.resolver("viejo");
    expect(await nuevo).toBe("nuevo");
  });

  it("con SWR sirve el valor vencido y refresca en background", async () => {
    await conTTL("t-swr", "k", -1, true, async () => "v1");
    const servido = await conTTL("t-swr", "k", 60_000, true, async () => "v2");
    expect(servido).toBe("v1");
    await new Promise((r) => setTimeout(r, 0));
    expect(await conTTL("t-swr", "k", 60_000, true, async () => "v3")).toBe("v2");
  });
});
