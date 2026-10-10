import assert from "node:assert/strict";
import { test } from "node:test";
import { haversineDistance, positionFromParams } from "../lib/geo";
import { NextRequest } from "next/server";
import { GET } from "../app/api/stations/route";

test("rechaza coordenadas ausentes, vacías, malformadas o fuera de rango", () => {
  for (const query of ["", "lat=&lng=", "lat=40", "lat= &lng=-3", "lat=91&lng=-3", "lat=40&lng=181", "lat=40foo&lng=-3", "lat=Infinity&lng=0", "lat=0x10&lng=0"]) {
    assert.equal(positionFromParams(new URLSearchParams(query)), null, query);
  }
  assert.deepEqual(positionFromParams(new URLSearchParams("lat=0&lng=0")), { latitude: 0, longitude: 0 });
});

test("distancias conocidas y antípodas no producen NaN", () => {
  const origin = { latitude: 0, longitude: 0 };
  assert.equal(haversineDistance(origin, origin), 0);
  assert.ok(Math.abs(haversineDistance(origin, { latitude: 0, longitude: 1 }) - 111.195) < 0.01);
  assert.ok(Number.isFinite(haversineDistance(origin, { latitude: 0, longitude: 180 })));
});

test("la API devuelve 400 sin consultar el Ministerio cuando faltan coordenadas", async () => {
  for (const query of ["", "?lat=&lng=", "?lat=40", "?lat=200&lng=0"]) {
    const result = await GET(new NextRequest(`http://localhost/api/stations${query}`));
    assert.equal(result.status, 400);
  }
});
