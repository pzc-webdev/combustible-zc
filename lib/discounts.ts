import type { Discount } from "./types";
import { parseSpanishNumber } from "./numbers";

export function validDiscountValues(brand: unknown, cents: unknown): boolean {
  const amount = parseSpanishNumber(cents);
  return typeof brand === "string" && brand.trim().length > 0 && brand.trim().length <= 40 &&
    Number.isFinite(amount) && amount >= 0.1 && amount <= 100 &&
    Math.abs(amount * 10 - Math.round(amount * 10)) < 1e-8;
}

export function sanitizeDiscounts(value: unknown): Discount[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" ||
      !entry.id.trim() || seen.has(entry.id) || !validDiscountValues(entry.brand, entry.cents)) return [];
    seen.add(entry.id);
    return [{ id: entry.id, brand: entry.brand.trim(), cents: String(parseSpanishNumber(entry.cents)) }];
  });
}

export function applicableDiscount(brand: string, discounts: Discount[]): number {
  const normalizedBrand = brand.toLocaleUpperCase("es-ES");
  return discounts.reduce((largest, discount) => {
    if (!validDiscountValues(discount.brand, discount.cents)) return largest;
    return normalizedBrand.includes(discount.brand.trim().toLocaleUpperCase("es-ES"))
      ? Math.max(largest, parseSpanishNumber(discount.cents)) : largest;
  }, 0);
}
