import assert from "node:assert/strict";
import { test } from "node:test";
import { createJourneyRouter, JourneyBusyError } from "../lib/server/journey-router";
import { journeyCandidates, type JourneyRequest } from "../lib/journey";

const input: JourneyRequest = { origin: { latitude: 37.4, longitude: -6 }, destination: { latitude: 37.4, longitude: -4.5 },
  maximumDetourKm: 5, selection: { family: "gasoline", grade: "normal" }, discounts: [] };
const base = { code: "Ok", waypoints: [{ distance: 0 }, { distance: 0 }], routes: [{ distance: 140000, duration: 5400,
  geometry: { type: "LineString", coordinates: [[-6, 37.4], [-4.5, 37.4]] } }] };
const table = { code: "Ok", distances: [[0, 140000, 70000], [140000, 0, 70000], [70000, 71000, 0]],
  durations: [[0, 5400, 2700], [5400, 0, 2700], [2700, 2760, 0]],
  sources: [{ distance: 0 }, { distance: 0 }, { distance: 10 }], destinations: [{ distance: 0 }, { distance: 0 }, { distance: 10 }] };
const candidates = async () => journeyCandidates([{ IDEESS: "mid", Latitud: "37,4", "Longitud (WGS84)": "-5,2", "Precio Gasolina 95 E5": "1,50" }], input,
  { distanceKm: 140, durationMinutes: 90, points: [input.origin, input.destination] });

test("consulta ruta completa y matriz dirigida con espera de un segundo y reutiliza caché", async t => {
  let clock = 1000;
  const calls: { url: URL; time: number }[] = [];
  const client = createJourneyRouter({ now: () => clock, wait: async ms => { clock += ms; }, baseUrl: "https://route.example/car/" });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls.push({ url, time: clock });
    return Response.json(url.pathname.includes("/route/") ? base : table);
  });
  const result = await client(input, candidates, new AbortController().signal);
  assert.equal(result.stations[0].detour!.distanceKm, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.searchParams.get("overview"), "full");
  assert.equal(calls[0].url.searchParams.get("geometries"), "geojson");
  assert.ok(calls[1].time - calls[0].time >= 1000);
  assert.equal(calls[1].url.searchParams.get("annotations"), "distance,duration");
  assert.equal(calls[1].url.searchParams.has("fallback_speed"), false);
  assert.equal((await client(input, candidates, new AbortController().signal)).stations.length, 1);
  assert.equal(calls.length, 2);
  // Altering the limit reuses roads, but reapplies the detour filter.
  assert.equal((await client({ ...input, maximumDetourKm: 0 }, candidates, new AbortController().signal)).stations.length, 0);
  assert.equal(calls.length, 2);
});

test("no consulta una matriz cuando no hay candidatas para el combustible", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json(base));
  const client = createJourneyRouter();
  const result = await client(input, async () => ({ stations: [], candidateCount: 0 }), new AbortController().signal);
  assert.equal(result.evaluatedCount, 0);
  assert.equal(fetch.mock.callCount(), 1);
});

test("cancelar una búsqueda evita nuevos tramos y libera la siguiente búsqueda", async t => {
  let clock = 1000;
  let calls = 0;
  const controller = new AbortController();
  const client = createJourneyRouter({ now: () => clock, wait: async ms => { clock += ms; } });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    calls++;
    if (calls === 1) controller.abort();
    return Response.json(url.pathname.includes("/route/") ? base : table);
  });
  await assert.rejects(client(input, candidates, controller.signal));
  assert.equal(calls, 1);
  assert.equal((await client(input, candidates, new AbortController().signal)).stations.length, 1);
});

test("dos búsquedas simultáneas no saturan el proveedor y el 429 es recuperable", async t => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  t.mock.method(globalThis, "fetch", async () => { await gate; return new Response("busy", { status: 429 }); });
  const client = createJourneyRouter();
  const pending = client(input, candidates, new AbortController().signal);
  await assert.rejects(client(input, candidates, new AbortController().signal), JourneyBusyError);
  release();
  await assert.rejects(pending, JourneyBusyError);
});
