import type { UserPosition } from "./types";
import { parseSpanishNumber } from "./numbers";

export function isValidPosition(position: UserPosition): boolean {
  return Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90 &&
    Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180;
}

export function positionFromParams(params: URLSearchParams): UserPosition | null {
  const position = {
    latitude: parseSpanishNumber(params.get("lat")),
    longitude: parseSpanishNumber(params.get("lng")),
  };
  return isValidPosition(position) ? position : null;
}

export function haversineDistance(origin: UserPosition, destination: UserPosition): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const a = Math.sin(radians(destination.latitude - origin.latitude) / 2) ** 2 +
    Math.cos(radians(origin.latitude)) * Math.cos(radians(destination.latitude)) *
    Math.sin(radians(destination.longitude - origin.longitude) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
