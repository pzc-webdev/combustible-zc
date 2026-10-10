import type { Discount, FuelSelection } from "./types";
import { sanitizeDiscounts } from "./discounts";
import { DEFAULT_PRICE_WEIGHT, DEFAULT_RADIUS_KM, MAX_RADIUS_KM, MIN_RADIUS_KM } from "./search-config";

export const PREFERENCES_KEY = "combustible-zc-preferences";
export type Preferences = {
  version: 1;
  selection: FuelSelection;
  discounts: Discount[];
  radiusKm: number;
  priceWeight: number;
};
type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;

export function normalizePreferences(value: unknown): Preferences {
  const input = value && typeof value === "object" ? value as Partial<Preferences> : {};
  return {
    version: 1,
    selection: {
      family: input.selection?.family === "diesel" ? "diesel" : "gasoline",
      grade: input.selection?.grade === "premium" ? "premium" : "normal",
    },
    discounts: sanitizeDiscounts(input.discounts),
    radiusKm: typeof input.radiusKm === "number" && Number.isInteger(input.radiusKm) &&
      input.radiusKm >= MIN_RADIUS_KM && input.radiusKm <= MAX_RADIUS_KM ? input.radiusKm : DEFAULT_RADIUS_KM,
    priceWeight: typeof input.priceWeight === "number" && Number.isFinite(input.priceWeight) &&
      input.priceWeight >= 0 && input.priceWeight <= 100 ? input.priceWeight : DEFAULT_PRICE_WEIGHT,
  };
}

function readValue(storage: ReturnType<StorageAccess>, key: string): unknown {
  try {
    const value = storage.getItem(key);
    return value === null ? undefined : JSON.parse(value);
  } catch { return undefined; }
}

export function loadPreferences(access: StorageAccess): Preferences {
  try {
    const storage = access();
    const saved = readValue(storage, PREFERENCES_KEY);
    if (saved && typeof saved === "object" && "version" in saved && saved.version === 1) {
      return normalizePreferences(saved);
    }
    return normalizePreferences({
      discounts: readValue(storage, "combustible-zc-discounts"),
      radiusKm: readValue(storage, "combustible-zc-radius"),
    });
  } catch { return normalizePreferences(undefined); }
}

export function savePreferences(access: StorageAccess, preferences: Preferences): boolean {
  try {
    access().setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(preferences)));
    return true;
  } catch { return false; }
}
