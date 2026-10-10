import { applicableDiscount } from "./discounts";
import { haversineDistance, isValidPosition } from "./geo";
import { normalizeStation } from "./station-data";
import { FUEL_KEYS } from "./stations";
import type { Discount, FuelSelection, RawStation, StationResult, UserPosition } from "./types";

export const DEFAULT_DETOUR_KM = 5;
export const MAX_DETOUR_KM = 20;
export const MAX_JOURNEY_CANDIDATES = 12;
export type JourneyRequest = { origin: UserPosition; destination: UserPosition;
  maximumDetourKm: number; selection: FuelSelection; discounts: Discount[] };
export type BaseRoute = { distanceKm: number; durationMinutes: number; points: UserPosition[] };
export type JourneyResult = { stations: StationResult[]; candidateCount: number; evaluatedCount: number;
  baseRoute: { distanceKm: number; durationMinutes: number }; sourceUpdatedAt: string | null };

export function validJourneyRequest(value: unknown): value is JourneyRequest {
  if (!value || typeof value !== "object") return false;
  const input = value as JourneyRequest;
  if (!input.origin || !input.destination || !isValidPosition(input.origin) || !isValidPosition(input.destination) ||
    !Number.isInteger(input.maximumDetourKm) || input.maximumDetourKm < 0 || input.maximumDetourKm > MAX_DETOUR_KM ||
    !input.selection || !["gasoline", "diesel"].includes(input.selection.family) ||
    !["normal", "premium"].includes(input.selection.grade) || !Array.isArray(input.discounts) || input.discounts.length > 30) return false;
  const distance = haversineDistance(input.origin, input.destination);
  return distance >= 0.1 && distance <= 1500;
}

const cellSize = 0.2;
const cell = (value: number) => Math.floor(value / cellSize);
export function routeCorridor(points: UserPosition[], radiusKm: number) {
  const grid = new Map<string, number[]>();
  let length = 0;
  const segments = points.slice(1).map((end, index) => {
    const start = points[index];
    const distance = haversineDistance(start, end);
    const segment = { start, end, distance, progress: length };
    length += distance;
    const minX = cell(Math.min(start.longitude, end.longitude)), maxX = cell(Math.max(start.longitude, end.longitude));
    const minY = cell(Math.min(start.latitude, end.latitude)), maxY = cell(Math.max(start.latitude, end.latitude));
    if ((maxX - minX + 1) * (maxY - minY + 1) > 1000) throw new Error("La geometría de la ruta no es válida");
    for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
      const key = `${x}:${y}`;
      const entries = grid.get(key) ?? [];
      entries.push(index);
      grid.set(key, entries);
    }
    return segment;
  });
  return (point: UserPosition) => {
    const scaleX = 111.32 * Math.cos(point.latitude * Math.PI / 180);
    if (scaleX < 1) return null;
    const margin = radiusKm + 0.2;
    const indices = new Set<number>();
    for (let x = cell(point.longitude - margin / scaleX); x <= cell(point.longitude + margin / scaleX); x++) {
      for (let y = cell(point.latitude - margin / 111.32); y <= cell(point.latitude + margin / 111.32); y++) {
        for (const index of grid.get(`${x}:${y}`) ?? []) indices.add(index);
      }
    }
    let best = Infinity, progress = 0;
    for (const index of indices) {
      const s = segments[index];
      const ax = (s.start.longitude - point.longitude) * scaleX, ay = (s.start.latitude - point.latitude) * 111.32;
      const dx = (s.end.longitude - s.start.longitude) * scaleX, dy = (s.end.latitude - s.start.latitude) * 111.32;
      const t = dx * dx + dy * dy === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)));
      const distance = Math.hypot(ax + t * dx, ay + t * dy);
      if (distance < best) { best = distance; progress = (s.progress + t * s.distance) / (length || 1); }
    }
    return best <= margin ? { distanceKm: best, progress } : null;
  };
}

export function journeyCandidates(raw: RawStation[], input: JourneyRequest, route: BaseRoute) {
  const inCorridor = routeCorridor(route.points, Math.max(1, input.maximumDetourKm));
  const nearby = raw.flatMap((value, index) => {
    const station = normalizeStation(value, FUEL_KEYS[`${input.selection.family}-${input.selection.grade}`], index);
    if (!station) return [];
    const corridor = inCorridor(station);
    if (!corridor) return [];
    const discountCents = applicableDiscount(station.brand, input.discounts);
    return [{ station: { ...station, discountCents, finalPrice: Math.max(0, station.originalPrice - discountCents / 100),
      distanceKm: haversineDistance(input.origin, station), score: 0 } as StationResult, ...corridor }];
  });
  const cheapest = [...nearby].sort((a, b) => a.station.finalPrice - b.station.finalPrice || a.distanceKm - b.distanceKm);
  const selected = new Map(cheapest.slice(0, 6).map(value => [value.station.id, value.station]));
  // Cover six stretches of the whole journey, including stations far from the origin.
  for (let bin = 0; bin < 6; bin++) {
    const closest = nearby.filter(value => Math.min(5, Math.floor(value.progress * 6)) === bin)
      .sort((a, b) => a.distanceKm - b.distanceKm || a.station.finalPrice - b.station.finalPrice)[0];
    if (closest) selected.set(closest.station.id, closest.station);
  }
  for (const value of cheapest) {
    if (selected.size >= MAX_JOURNEY_CANDIDATES) break;
    selected.set(value.station.id, value.station);
  }
  return { stations: [...selected.values()], candidateCount: new Set(nearby.map(value => value.station.id)).size };
}

const finiteNonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function snapIsValid(value: unknown, maxMeters: number): boolean {
  return !!value && typeof value === "object" && finiteNonnegative((value as Record<string, unknown>).distance) &&
    ((value as Record<string, unknown>).distance as number) <= maxMeters;
}

export function normalizeBaseRoute(payload: unknown): BaseRoute {
  if (!payload || typeof payload !== "object") throw new Error("No se pudo calcular el trayecto");
  const data = payload as Record<string, unknown>;
  const route = Array.isArray(data.routes) ? data.routes[0] as Record<string, unknown> : undefined;
  const geometry = route?.geometry as Record<string, unknown> | undefined;
  if (data.code !== "Ok" || !route || !finiteNonnegative(route.distance) || !finiteNonnegative(route.duration) ||
    !geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2 || geometry.coordinates.length > 100_000 || !Array.isArray(data.waypoints) ||
    data.waypoints.length !== 2 || !data.waypoints.every(point => snapIsValid(point, 1000))) {
    throw new Error("No hay un trayecto por carretera válido entre estos lugares");
  }
  const points = geometry.coordinates.map((value: unknown) => {
    if (!Array.isArray(value) || value.length < 2 || !isValidPosition({ latitude: value[1], longitude: value[0] })) {
      throw new Error("La geometría de la ruta no es válida");
    }
    return { longitude: value[0] as number, latitude: value[1] as number };
  });
  return { distanceKm: route.distance / 1000, durationMinutes: route.duration / 60, points };
}

export function normalizeJourneyTable(payload: unknown, stations: StationResult[], base: BaseRoute, maximumDetourKm: number) {
  if (!payload || typeof payload !== "object") throw new Error("Respuesta de rutas inválida");
  const data = payload as Record<string, unknown>;
  const size = stations.length + 2;
  const matrix = (value: unknown): value is (number | null)[][] => Array.isArray(value) && value.length === size &&
    value.every(row => Array.isArray(row) && row.length === size && row.every(cell => cell === null || finiteNonnegative(cell)));
  if (data.code !== "Ok" || !matrix(data.distances) || !matrix(data.durations) ||
    !Array.isArray(data.sources) || data.sources.length !== size || !Array.isArray(data.destinations) || data.destinations.length !== size ||
    (Array.isArray(data.fallback_speed_cells) && data.fallback_speed_cells.length)) throw new Error("No se pudieron comparar los desvíos");
  const distance = data.distances[0][1], duration = data.durations[0][1];
  if (distance === null || duration === null || ![data.sources[0], data.sources[1], data.destinations[0], data.destinations[1]].every(p => snapIsValid(p, 1000)) ||
    Math.abs(distance / 1000 - base.distanceKm) > Math.max(0.1, base.distanceKm * 0.01)) {
    throw new Error("El trayecto ha cambiado. Vuelve a buscar la ruta");
  }
  const distances = data.distances, durations = data.durations;
  const sources = data.sources, destinations = data.destinations;
  const matches = stations.flatMap((station, index) => {
    const i = index + 2;
    const before = distances[0][i], after = distances[i][1], beforeTime = durations[0][i], afterTime = durations[i][1];
    if (before === null || after === null || beforeTime === null || afterTime === null ||
      !snapIsValid(sources[i], 150) || !snapIsValid(destinations[i], 150)) return [];
    const extraKm = (before + after - distance) / 1000, extraMinutes = (beforeTime + afterTime - duration) / 60;
    // Reject inconsistent routes instead of presenting a negative detour as a benefit.
    if (extraKm < -0.05 || extraMinutes < -1 || extraKm > maximumDetourKm + 1e-6) return [];
    return [{ ...station, detour: { distanceKm: Math.max(0, extraKm), durationMinutes: Math.max(0, extraMinutes) } }];
  });
  return { stations: matches, baseRoute: { distanceKm: distance / 1000, durationMinutes: duration / 60 } };
}
