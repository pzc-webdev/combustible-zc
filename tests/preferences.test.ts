import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPreferences, normalizePreferences, PREFERENCES_KEY, savePreferences } from "../lib/preferences";
import { sanitizeDiscounts, validDiscountValues } from "../lib/discounts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); } };
}
const discount = { id: "1", brand: " Repsol ", cents: "8,5" };

test("migra los descuentos y radio antiguos conservando los datos válidos", () => {
  const storage = memoryStorage({ "combustible-zc-discounts": JSON.stringify([discount, null, {}]), "combustible-zc-radius": "25" });
  const result = loadPreferences(() => storage);
  assert.equal(result.radiusKm, 25);
  assert.deepEqual(result.discounts, [{ ...discount, brand: "Repsol", cents: "8.5" }]);
  assert.equal(savePreferences(() => storage, result), true);
  assert.equal(JSON.parse(storage.getItem(PREFERENCES_KEY)!).version, 1);
});

test("conserva combustible, ponderación y descuentos tras guardar y recargar", () => {
  const storage = memoryStorage();
  const original = normalizePreferences({ selection: { family: "diesel", grade: "premium" }, priceWeight: 35, radiusKm: 10, discounts: [discount] });
  savePreferences(() => storage, original);
  assert.deepEqual(loadPreferences(() => storage), original);
});

test("un JSON corrupto no impide recuperar el radio antiguo", () => {
  const storage = memoryStorage({ [PREFERENCES_KEY]: "{", "combustible-zc-discounts": "broken", "combustible-zc-radius": "50" });
  assert.equal(loadPreferences(() => storage).radiusKm, 50);
  assert.deepEqual(loadPreferences(() => storage).discounts, []);
});

test("el acceso bloqueado y los errores de escritura no se propagan", () => {
  const unavailable = () => { throw new Error("SecurityError"); };
  const defaults = normalizePreferences(null);
  assert.deepEqual(loadPreferences(unavailable), defaults);
  assert.equal(savePreferences(unavailable, defaults), false);
  const quota = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); } };
  assert.equal(savePreferences(() => quota, defaults), false);
});

test("rechaza valores de preferencias inválidos y descuentos malformados", () => {
  const result = normalizePreferences({ selection: null, radiusKm: 500, priceWeight: NaN, discounts: [null, {}, { ...discount, brand: 4 }, { ...discount, cents: "101" }] });
  assert.deepEqual(result, normalizePreferences(undefined));
  assert.equal(sanitizeDiscounts([discount, discount]).length, 1);
  for (const cents of ["", "8foo", "-1", "0", "100.1", "1.11", "Infinity"]) {
    assert.equal(validDiscountValues("Marca", cents), false, cents);
  }
  assert.equal(validDiscountValues("Marca", "0,1"), true);
  assert.equal(validDiscountValues("Marca", "100"), true);
});

test("conserva el límite de desvío y retira las preferencias del panel económico", () => {
  const storage = memoryStorage({ [PREFERENCES_KEY]: JSON.stringify({ version: 2, radiusKm: 25, priceWeight: 50,
    selection: { family: "diesel", grade: "premium" }, discounts: [discount], refueling: { liters: 40, consumption: 6 } }) });
  const restored = loadPreferences(() => storage);
  assert.equal(restored.version, 1);
  assert.equal(restored.radiusKm, 25);
  assert.equal(restored.priceWeight, 50);
  assert.equal(restored.selection.family, "diesel");
  assert.equal("refueling" in restored, false);
  savePreferences(() => storage, { ...restored, maximumDetourKm: 10 });
  assert.equal(loadPreferences(() => storage).maximumDetourKm, 10);
  for (const maximumDetourKm of [-1, 21, 2.5, Infinity, null]) {
    assert.equal(normalizePreferences({ maximumDetourKm }).maximumDetourKm, 5);
  }
});
