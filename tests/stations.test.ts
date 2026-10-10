import assert from "node:assert/strict";
import { test } from "node:test";
import { processStations } from "../lib/stations";
import type { RawStation } from "../lib/types";

const origin = { latitude: 40, longitude: -3 };
const fuel = { family: "gasoline", grade: "normal" } as const;
function station(id: string, price: string, latitude = "40,01", brand = "Marca") : RawStation {
  return { IDEESS: id, "Precio Gasolina 95 E5": price, Latitud: latitude,
    "Longitud (WGS84)": "-3", "Rótulo": brand };
}

test("descarta precios ausentes y estaciones fuera del radio", () => {
  const result = processStations([station("ok", "1,50"), station("empty", ""),
    station("zero", "0"), station("far", "1,40", "42")], fuel, [], origin);
  assert.deepEqual(result.cheapest.map(s => s.id), ["ok"]);
});

test("aplica el descuento mayor coincidente antes de ordenar", () => {
  const result = processStations([station("a", "1,50", "40,01", "REPSOL"), station("b", "1,45")],
    fuel, [{ id: "1", brand: "repsol", cents: "8,5" }, { id: "2", brand: "REPSOL", cents: "5" }], origin);
  assert.equal(result.cheapest[0].id, "a");
  assert.equal(result.cheapest[0].discountCents, 8.5);
  assert.ok(Math.abs(result.cheapest[0].finalPrice - 1.415) < 1e-9);
});

test("peso 100 prioriza precio y peso 0 prioriza distancia", () => {
  const input = [station("near", "1,60", "40,001"), station("cheap", "1,40", "40,05")];
  assert.equal(processStations(input, fuel, [], origin, 15, 100).smartest[0].id, "cheap");
  assert.equal(processStations(input, fuel, [], origin, 15, 0).smartest[0].id, "near");
});

test("los empates en precio se resuelven por distancia", () => {
  const result = processStations([station("far", "1,5", "40,05"), station("near", "1,5", "40,01")], fuel, [], origin);
  assert.equal(result.cheapest[0].id, "near");
  assert.equal(result.smartest[0].id, "near");
});

test("una sola estación y las listas vacías no producen puntuaciones inválidas", () => {
  assert.equal(processStations([station("only", "1,5")], fuel, [], origin).smartest[0].score, 100);
  assert.deepEqual(processStations([], fuel, [], origin), { cheapest: [], nearest: [], smartest: [] });
});

test("descuentos editados fuera de límites y números parciales no alteran resultados", () => {
  const result = processStations([station("ok", "1,5"), station("bad", "1,2foo"), station("bad-position", "1,5", "99")],
    fuel, [{ id: "1", brand: "Marca", cents: "150" }], origin);
  assert.equal(result.cheapest.length, 1);
  assert.equal(result.cheapest[0].finalPrice, 1.5);
});
