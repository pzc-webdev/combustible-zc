import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { normalizePhotonCandidates } from "../lib/geocoding";
import { GET as search } from "../app/api/locations/route";

const photonPostcode = {
  geometry: { type: "Point", coordinates: [-5.924549, 37.399649] },
  properties: { name: "41020", type: "other", osm_key: "place", osm_value: "postcode",
    city: "Sevilla", county: "Sevilla", countrycode: "ES" },
};

test("conserva coincidencias ambiguas con provincia y clasifica la precisión", () => {
  const feature = (properties: Record<string, unknown>) => ({
    geometry: { type: "Point", coordinates: [-3.7, 40.4] },
    properties: { countrycode: "ES", ...properties },
  });
  const results = normalizePhotonCandidates({ features: [
    feature({ osm_id: 1, type: "town", name: "San Pedro", county: "Albacete" }),
    feature({ osm_id: 2, type: "village", name: "San Pedro", county: "Lugo" }),
    photonPostcode,
    feature({ osm_id: 3, type: "house", street: "Calle Alcalá", housenumber: "1", city: "Madrid" }),
    feature({ osm_id: 4, type: "street", name: "Calle Alcalá", city: "Madrid" }),
    feature({ type: "house", street: "Calle sin número" }),
    feature({ type: "other", name: "Comercio" }), null,
  ] });
  assert.equal(results.length, 5);
  assert.equal(results[1].province, "Lugo");
  assert.deepEqual(results.map(r => r.precision), ["area", "area", "area", "address", "street"]);
  assert.equal(results[3].label, "Calle Alcalá 1, Madrid");
});

test("normaliza códigos postales sin ID OSM y rechaza duplicados y coordenadas inválidas", () => {
  const locations = normalizePhotonCandidates({ features: [photonPostcode, photonPostcode,
    { ...photonPostcode, properties: { ...photonPostcode.properties, countrycode: "FR" } },
    ...[[181, 0], [-3, 100], [null, null], []].map(coordinates => ({
      ...photonPostcode, geometry: { type: "Point", coordinates },
    })),
  ] });
  assert.equal(locations.length, 1);
  assert.equal(locations[0].source, "photon");
  assert.equal(locations[0].precision, "area");
  assert.equal(locations[0].label, "41020, Sevilla");
  assert.deepEqual(locations[0].position, { latitude: 37.399649, longitude: -5.924549 });
  for (const invalid of [null, {}, [], { features: null }]) {
    assert.throws(() => normalizePhotonCandidates(invalid));
  }
});

test("valida consultas antes de llamar al proveedor", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ features: [] }));
  for (const query of ["", "a", " ", "x".repeat(161)]) {
    const response = await search(new NextRequest(`http://localhost/api/locations?${new URLSearchParams({ q: query })}`));
    assert.equal(response.status, 400);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("la API consulta directamente Photon y reutiliza las coordenadas en caché", async t => {
  const calls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    const url = new URL(input);
    calls.push(url);
    assert.equal(url.hostname, "photon.komoot.io");
    assert.equal(url.searchParams.get("countrycode"), "ES");
    assert.equal(url.searchParams.get("limit"), "8");
    assert.equal(url.searchParams.get("q"), "41020");
    return Response.json({ features: [photonPostcode] });
  });
  const request = () => new NextRequest("http://localhost/api/locations?q=41020");
  const result = await search(request());
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  const payload = await result.json();
  assert.equal(payload.source, "photon");
  assert.deepEqual(payload.locations[0].position, { latitude: 37.399649, longitude: -5.924549 });
  assert.deepEqual(await (await search(request())).json(), payload);
  assert.equal(calls.length, 1);
});

test("fallos, respuestas inválidas y límites del proveedor generan errores recuperables", async t => {
  t.mock.method(globalThis, "fetch", async () => new Response("busy", { status: 429 }));
  const busy = await search(new NextRequest("http://localhost/api/locations?q=busy-provider"));
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get("Retry-After"), "5");
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network error"); });
  assert.equal((await search(new NextRequest("http://localhost/api/locations?q=failed-provider"))).status, 502);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => Response.json({ invalid: true }));
  assert.equal((await search(new NextRequest("http://localhost/api/locations?q=malformed-provider"))).status, 502);
});

test("respeta la cancelación incluso con resultados en caché", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ features: [] }));
  const controller = new AbortController();
  controller.abort();
  for (const query of ["cancelled-query", "41020"]) {
    await search(new NextRequest(`http://localhost/api/locations?q=${query}`, { signal: controller.signal }));
  }
  assert.equal(fetch.mock.callCount(), 0);
});
