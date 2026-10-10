import type { LocationCandidate, LocationPrecision } from "./types";
import { isValidPosition } from "./geo";

export const MIN_LOCATION_QUERY = 3;
export const MAX_LOCATION_QUERY = 160;

export function normalizePhotonCandidates(payload: unknown): LocationCandidate[] {
  if (!payload || typeof payload !== "object" || !("features" in payload) || !Array.isArray(payload.features)) {
    throw new Error("Respuesta de ubicaciones inválida");
  }
  const seen = new Set<string>();
  return payload.features.flatMap((feature: unknown) => {
    if (!feature || typeof feature !== "object") return [];
    const { geometry, properties } = feature as Record<string, unknown>;
    if (!geometry || typeof geometry !== "object" || !properties || typeof properties !== "object") return [];
    const geo = geometry as Record<string, unknown>;
    const props = properties as Record<string, unknown>;
    const field = (key: string) => typeof props[key] === "string" ? props[key].trim() : "";
    if (field("countrycode").toUpperCase() !== "ES" || geo.type !== "Point" || !Array.isArray(geo.coordinates)) return [];
    const [longitude, latitude] = geo.coordinates;
    if (typeof latitude !== "number" || typeof longitude !== "number" || !isValidPosition({ latitude, longitude })) return [];
    const kind = field("type");
    const postcode = field("osm_value") === "postcode";
    const street = field("street"), number = field("housenumber");
    // Only offer locations usable as a search origin, excluding unrelated POIs.
    if (!postcode && !["city", "town", "village", "locality", "district", "street", "house"].includes(kind)) return [];
    if (kind === "house" && (!street || !number)) return [];
    const municipality = field("city") || (["city", "town", "village"].includes(kind) ? field("name") : "");
    const province = field("county") || field("state");
    const name = postcode ? field("name") || field("postcode")
      : kind === "house" ? `${street} ${number}` : field("name") || street;
    if (!name) return [];
    const label = municipality && name !== municipality ? `${name}, ${municipality}` : name;
    const id = `${field("osm_type") || "postcode"}:${props.osm_id ?? name}:${longitude}:${latitude}`;
    if (seen.has(id)) return [];
    seen.add(id);
    const precision: LocationPrecision = kind === "house" ? "address" : kind === "street" ? "street" : "area";
    return [{ id, type: "photon", source: "photon" as const, label, municipality, province,
      precision, position: { latitude, longitude } }];
  }).slice(0, 8);
}
