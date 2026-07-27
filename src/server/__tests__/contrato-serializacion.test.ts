import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { bigId, iso, num } from "../services/mappers";

/**
 * Test de contrato de serialización: los tipos Prisma mueren en los mappers.
 * Si un Decimal/BigInt/Date llegara a un DTO, JSON.stringify lo delataría
 * (BigInt lanza TypeError; Decimal serializa como string con comillas).
 */
describe("contrato de serialización (Decimal/BigInt/Date → planos)", () => {
  it("num convierte Prisma.Decimal a number (y null pasa)", () => {
    expect(num(new Prisma.Decimal("55.7522"))).toBeCloseTo(55.7522, 4);
    expect(num(new Prisma.Decimal("272543"))).toBe(272543);
    expect(num(null)).toBeNull();
    expect(num(19.5)).toBe(19.5);
  });

  it("bigId convierte BigInt a string", () => {
    expect(bigId(BigInt("9007199254740993"))).toBe("9007199254740993");
  });

  it("iso convierte Date a ISO string", () => {
    expect(iso(new Date("2026-06-30T00:00:00Z"))).toBe(
      "2026-06-30T00:00:00.000Z",
    );
    expect(iso(null)).toBeNull();
  });

  it("un DTO mapeado sobrevive JSON.stringify sin tipos exóticos", () => {
    const dto = {
      id: bigId(BigInt(16)),
      valorObservado: num(new Prisma.Decimal("19.5")),
      fechaReporte: iso(new Date()),
      numerador: num(null),
    };
    const json = JSON.stringify(dto);
    const vuelta = JSON.parse(json) as typeof dto;
    expect(typeof vuelta.id).toBe("string");
    expect(typeof vuelta.valorObservado).toBe("number");
    expect(typeof vuelta.fechaReporte).toBe("string");
    expect(vuelta.numerador).toBeNull();
  });

  it("BigInt crudo en un DTO habría fallado (garantía del test)", () => {
    expect(() => JSON.stringify({ id: BigInt(1) })).toThrow();
  });
});
