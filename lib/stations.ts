import type { Discount, FuelSelection, RawStation, ResultLists, UserPosition } from "./types";
import { DEFAULT_PRICE_WEIGHT, DEFAULT_RADIUS_KM } from "./search-config";
import { haversineDistance, isValidPosition } from "./geo";
import { applicableDiscount } from "./discounts";
import { normalizeStation } from "./station-data";
import { rankStations } from "./ranking";

export * from "./search-config";
export { haversineDistance } from "./geo";
export { parseSpanishNumber } from "./numbers";

export const FUEL_KEYS: Record<string, string> = {
  "gasoline-normal": "Precio Gasolina 95 E5",
  "gasoline-premium": "Precio Gasolina 98 E5",
  "diesel-normal": "Precio Gasoleo A",
  "diesel-premium": "Precio Gasoleo Premium",
};

export function processStations(
  rawStations: RawStation[], selection: FuelSelection, discounts: Discount[],
  userPosition: UserPosition, maximumDistanceKm = DEFAULT_RADIUS_KM,
  priceWeight = DEFAULT_PRICE_WEIGHT,
): ResultLists {
  if (!isValidPosition(userPosition)) return { cheapest: [], nearest: [], smartest: [] };
  const fuelKey = FUEL_KEYS[`${selection.family}-${selection.grade}`];
  const nearby = rawStations.flatMap((raw, index) => {
    const station = normalizeStation(raw, fuelKey, index);
    if (!station) return [];
    const distanceKm = haversineDistance(userPosition, station);
    if (distanceKm > maximumDistanceKm) return [];
    const discountCents = applicableDiscount(station.brand, discounts);
    return [{ ...station, distanceKm, discountCents,
      finalPrice: Math.max(0, station.originalPrice - discountCents / 100), score: 0 }];
  });
  return rankStations(nearby, priceWeight);
}
