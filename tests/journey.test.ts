import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/journey/route";
import { journeyCandidates, normalizeBaseRoute, normalizeJourneyTable, routeCorridor, validJourneyRequest,
  type BaseRoute, type JourneyRequest } from "../lib/journey";
import { rankStations } from "../lib/ranking";
import type { RawStation, StationResult } from "../lib/types";

export const input: JourneyRequest = { origin: { latitude: 37.4, longitude: -6 }, destination: { latitude: 37.4, longitude: -4.5 },
  maximumDetourKm: 5, selection: { family: "gasoline", grade: "normal" }, discounts: [] };
const base: BaseRoute = { distanceKm: 140, durationMinutes: 90, points: [input.origin, input.destination] };
const station = (id: string, longitude: number, price = "1,60", latitude = "37,4"): RawStation => ({ IDEESS: id,
  "Rótulo": id, "Precio Gasolina 95 E5": price, Latitud: latitude, "Longitud (WGS84)": String(longitude) });
export const candidates: StationResult[] = journeyCandidates([station("near", -5.9), station("far", -4.6, "1,50")], input, base)
  .stations.sort((a, b) => b.finalPrice - a.finalPrice);
export const basePayload = () => ({ code: "Ok", waypoints: [{ distance: 10 }, { distance: 10 }],
  routes: [{ distance: 140000, duration: 5400, geometry: { type: "LineString", coordinates: [[-6, 37.4], [-4.5, 37.4]] } }] });
export const tablePayload = () => ({ code: "Ok", distances: [[0, 140000, 10000, 120000], [140000, 0, 130000, 20000],
  [10000, 131000, 0, 110000], [120000, 24000, 110000, 0]],
  durations: [[0, 5400, 500, 4700], [5400, 0, 5000, 800], [500, 4960, 0, 4200], [4700, 940, 4200, 0]],
  sources: Array.from({ length: 4 }, () => ({ distance: 10 })),
  destinations: Array.from({ length: 4 }, () => ({ distance: 10 })) });

test("el corredor recorre toda la ruta e incluye estaciones a más de 50 km del origen", () => {
  const found = journeyCandidates([station("near", -5.9), station("far", -4.6, "1,50"), station("outside", -5, "1,40", "38")], input, base);
  assert.equal(found.candidateCount, 2);
  assert.ok(found.stations.find(s => s.id === "far")!.distanceKm > 50);
  const corridor = routeCorridor([input.origin, { latitude: 38.1, longitude: -6 }, { latitude: 38.1, longitude: -4.5 }], 5);
  assert.ok(corridor({ latitude: 38.1, longitude: -5 }));
  assert.equal(corridor({ latitude: 37.4, longitude: -5 }), null);
});

test("la selección limita a doce, aplica descuentos y cubre diferentes tramos", () => {
  const raw = Array.from({ length: 60 }, (_, i) => station(String(i), -6 + (i + 1) * 1.5 / 61, i < 6 ? "1,40" : "1,60"));
  const chosen = journeyCandidates(raw, { ...input, discounts: [{ id: "loyalty", brand: "59", cents: "30" }] }, base);
  assert.equal(chosen.candidateCount, 60);
  assert.equal(chosen.stations.length, 12);
  assert.equal(new Set(chosen.stations.map(s => s.id)).size, 12);
  assert.equal(chosen.stations[0].id, "59");
  assert.equal(chosen.stations[0].finalPrice, 1.3);
  assert.ok(chosen.stations.some(s => Number(s.id) > 40));
});

test("calcula origen-estación-destino y respeta el límite inclusive de kilómetros extra", () => {
  const result = normalizeJourneyTable(tablePayload(), candidates, base, 5);
  assert.deepEqual(result.stations.map(s => s.detour), [{ distanceKm: 1, durationMinutes: 1 }, { distanceKm: 4, durationMinutes: 4 }]);
  assert.equal(normalizeJourneyTable(tablePayload(), candidates, base, 1).stations.length, 1);
  assert.equal(normalizeJourneyTable(tablePayload(), candidates, base, 0).stations.length, 0);
});

test("descarta tramos inaccesibles, desvíos negativos y ajustes de estación mayores de 150 m", () => {
  const missing: Omit<ReturnType<typeof tablePayload>, "distances"> & { distances: (number | null)[][] } = tablePayload();
  missing.distances[3][1] = null;
  assert.equal(normalizeJourneyTable(missing, candidates, base, 5).stations.length, 1);
  const negative = tablePayload();
  negative.distances[3][1] = 19000;
  assert.equal(normalizeJourneyTable(negative, candidates, base, 5).stations.length, 1);
  const far = tablePayload();
  far.sources[3].distance = 151;
  assert.equal(normalizeJourneyTable(far, candidates, base, 5).stations.length, 1);
});

test("rechaza respuestas incompletas, geometrías inválidas y estimaciones aéreas", () => {
  for (const payload of [null, {}, { ...basePayload(), code: "NoRoute" }, { ...basePayload(), waypoints: [] }]) {
    assert.throws(() => normalizeBaseRoute(payload));
  }
  const bad = basePayload();
  bad.routes[0].geometry.coordinates[0] = [200, 100];
  assert.throws(() => normalizeBaseRoute(bad));
  for (const payload of [null, {}, { ...tablePayload(), distances: [] }, { ...tablePayload(), fallback_speed_cells: [[0, 2]] }]) {
    assert.throws(() => normalizeJourneyTable(payload, candidates, base, 5));
  }
  const changed = tablePayload();
  changed.distances[0][1] = 160000;
  assert.throws(() => normalizeJourneyTable(changed, candidates, base, 5));
});

test("la cercanía y ponderación de ruta usan el desvío, no la distancia al origen", () => {
  const routed = normalizeJourneyTable(tablePayload(), candidates, base, 5).stations;
  routed[0].distanceKm = 120;
  routed[1].distanceKm = 1;
  assert.equal(rankStations(routed, 0).nearest[0].id, routed[0].id);
  assert.equal(rankStations(routed, 0).smartest[0].id, routed[0].id);
  assert.equal(rankStations(routed, 100).smartest[0].id, routed[1].id);
});

test("la API valida lugares, límites y combustible antes de llamar a servicios externos", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected fetch"); });
  assert.equal(validJourneyRequest(input), true);
  for (const value of [null, {}, { ...input, origin: null }, { ...input, destination: input.origin },
    { ...input, maximumDetourKm: -1 }, { ...input, maximumDetourKm: 21 }, { ...input, maximumDetourKm: 2.5 },
    { ...input, selection: { family: "other", grade: "normal" } }, { ...input, discounts: null }]) {
    const response = await POST(new NextRequest("http://localhost/api/journey", { method: "POST", body: JSON.stringify(value) }));
    assert.equal(response.status, 400);
  }
  assert.equal((await POST(new NextRequest("http://localhost/api/journey", { method: "POST", body: "{" }))).status, 400);
  assert.equal(fetch.mock.callCount(), 0);
});
