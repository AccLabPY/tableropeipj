import type { Prisma } from "@prisma/client";

/**
 * Convención de serialización (§ Decisión 3 del plan):
 * los tipos Prisma MUEREN acá. Decimal→number, BigInt→string, Date→ISO.
 * Ningún DTO que cruce a la UI o a la API puede contener Decimal/BigInt/Date.
 */

export const num = (
  d: Prisma.Decimal | number | null | undefined,
): number | null => {
  if (d === null || d === undefined) return null;
  return typeof d === "number" ? d : d.toNumber();
};

export const iso = (d: Date | null | undefined): string | null =>
  d == null ? null : d.toISOString();

export const bigId = (b: bigint): string => b.toString();
