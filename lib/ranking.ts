import { DEFAULT_PRICE_WEIGHT } from "./search-config";
import type { ResultLists, StationResult } from "./types";

export function rankStations(stations: StationResult[], priceWeight: number): ResultLists {
  if (!stations.length) return { cheapest: [], nearest: [], smartest: [] };
  const prices = stations.map(s => s.finalPrice);
  const distances = stations.map(s => s.distanceKm);
  const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
  const minDistance = Math.min(...distances), maxDistance = Math.max(...distances);
  const normalize = (value: number, min: number, max: number) => max === min ? 0 : (value - min) / (max - min);
  const weight = Math.min(100, Math.max(0, Number.isFinite(priceWeight) ? priceWeight : DEFAULT_PRICE_WEIGHT)) / 100;
  const scored = stations.map(station => ({
    ...station,
    score: Math.round((1 - (normalize(station.finalPrice, minPrice, maxPrice) * weight +
      normalize(station.distanceKm, minDistance, maxDistance) * (1 - weight))) * 100),
  }));
  return {
    cheapest: [...scored].sort((a, b) => a.finalPrice - b.finalPrice || a.distanceKm - b.distanceKm),
    nearest: [...scored].sort((a, b) => a.distanceKm - b.distanceKm || a.finalPrice - b.finalPrice),
    smartest: [...scored].sort((a, b) => b.score - a.score || a.finalPrice - b.finalPrice || a.distanceKm - b.distanceKm),
  };
}
