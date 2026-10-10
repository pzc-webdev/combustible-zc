import { setTimeout as sleep } from "node:timers/promises";
import { normalizeBaseRoute, normalizeJourneyTable, type BaseRoute, type JourneyRequest } from "../journey";
import type { StationResult, UserPosition } from "../types";

export class JourneyBusyError extends Error {}
type CandidateSet = { stations: StationResult[]; candidateCount: number };

export function createJourneyRouter(options: { baseUrl?: string; now?: () => number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void> } = {}) {
  const now = options.now ?? Date.now;
  const pause = options.wait ?? (async (ms, signal) => { await sleep(ms, undefined, { signal }); });
  const cache = new Map<string, { payload: unknown; expires: number }>();
  let nextRequestAt = 0;
  let active = false;
  const query = async (service: "route" | "table", points: UserPosition[], signal: AbortSignal) => {
    signal.throwIfAborted();
    const baseUrl = options.baseUrl || process.env.OSRM_BASE_URL || "https://routing.openstreetmap.de/routed-car/";
    const coordinates = points.map(point => `${point.longitude},${point.latitude}`).join(";");
    const url = new URL(`${service}/v1/driving/${coordinates}`, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    url.search = new URLSearchParams(service === "route"
      ? { geometries: "geojson", overview: "full", alternatives: "false", steps: "false", generate_hints: "false" }
      : { annotations: "distance,duration", generate_hints: "false" }).toString();
    const key = url.toString();
    const cached = cache.get(key);
    if (cached && cached.expires > now()) return { payload: cached.payload, key };
    cache.delete(key);
    if (nextRequestAt > now()) await pause(nextRequestAt - now(), signal);
    signal.throwIfAborted();
    nextRequestAt = now() + 1000;
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "demenos/1.0 (https://demenos.vercel.app/)" },
      cache: "no-store", signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]) });
    if (response.status === 429) throw new JourneyBusyError();
    if (!response.ok) throw new Error("Servicio de rutas no disponible");
    const payload: unknown = await response.json();
    signal.throwIfAborted();
    if (cache.size >= 40) cache.delete(cache.keys().next().value!);
    cache.set(key, { payload, expires: now() + 300_000 });
    return { payload, key };
  };
  return async (input: JourneyRequest, candidates: (base: BaseRoute) => Promise<CandidateSet>, signal: AbortSignal) => {
    signal.throwIfAborted();
    if (active) throw new JourneyBusyError();
    active = true;
    const usedKeys: string[] = [];
    try {
      const result = await query("route", [input.origin, input.destination], signal);
      usedKeys.push(result.key);
      const base = normalizeBaseRoute(result.payload);
      const selected = await candidates(base);
      signal.throwIfAborted();
      if (!selected.stations.length) return { stations: [], candidateCount: selected.candidateCount, evaluatedCount: 0,
        baseRoute: { distanceKm: base.distanceKm, durationMinutes: base.durationMinutes } };
      const table = await query("table", [input.origin, input.destination, ...selected.stations], signal);
      usedKeys.push(table.key);
      const compared = normalizeJourneyTable(table.payload, selected.stations, base, input.maximumDetourKm);
      return { ...compared, candidateCount: selected.candidateCount, evaluatedCount: selected.stations.length };
    } catch (error) {
      for (const key of usedKeys) cache.delete(key);
      throw error;
    } finally { active = false; }
  };
}

export const findJourneyStations = createJourneyRouter();
