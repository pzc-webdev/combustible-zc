import { isValidPosition } from "./geo";
import { parseSpanishNumber } from "./numbers";
import type { RawStation, StationResult } from "./types";

type NormalizedStation = Omit<StationResult, "distanceKm" | "finalPrice" | "discountCents" | "score">;
export function normalizeStation(station: RawStation, fuelKey: string, index: number): NormalizedStation | null {
  const originalPrice = parseSpanishNumber(station[fuelKey]);
  const position = {
    latitude: parseSpanishNumber(station.Latitud),
    longitude: parseSpanishNumber(station["Longitud (WGS84)"]),
  };
  if (!Number.isFinite(originalPrice) || originalPrice <= 0 || !isValidPosition(position)) return null;
  const field = (name: string) => typeof station[name] === "string" ? station[name].trim() : "";
  return {
    ...position, originalPrice,
    id: field("IDEESS") || `${field("C.P.")}-${position.latitude}-${position.longitude}-${index}`,
    brand: field("Rótulo") || "Sin rótulo",
    address: field("Dirección") || "Dirección no disponible",
    locality: field("Localidad") || field("Municipio"),
  };
}
