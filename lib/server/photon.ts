import { normalizePhotonCandidates } from "../geocoding";
import type { LocationCandidate } from "../types";
export class GeocoderBusyError extends Error {}

const cache = new Map<string, { locations: LocationCandidate[]; expires: number }>();
let activeRequests = 0;

export async function searchPhoton(query: string, signal: AbortSignal): Promise<LocationCandidate[]> {
  signal.throwIfAborted();
  const cached = cache.get(query);
  if (cached && cached.expires > Date.now()) return cached.locations;
  cache.delete(query);
  if (activeRequests >= 4) throw new GeocoderBusyError();
  const url = new URL(process.env.PHOTON_API_URL || "https://photon.komoot.io/api/");
  url.search = new URLSearchParams({ q: query, countrycode: "ES", limit: "8" }).toString();
  activeRequests++;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "demenos/1.0 (location search)" },
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(6_000)]),
    });
    if (response.status === 429) throw new GeocoderBusyError();
    if (!response.ok) throw new Error("El servicio de ubicaciones no está disponible");
    const locations = normalizePhotonCandidates(await response.json());
    signal.throwIfAborted();
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(query, { locations, expires: Date.now() + 60_000 });
    return locations;
  } finally { activeRequests--; }
}
