import { test, expect, type Page } from "@playwright/test";

const origin = { latitude: 37.4, longitude: -6 };
const destination = { latitude: 37.4, longitude: -4.5 };
const stations = [
  { id: "cheap", brand: "Barata al final del viaje", address: "Calle final 1", locality: "Córdoba",
    latitude: 37.4, longitude: -4.6, originalPrice: 1.5, finalPrice: 1.5, discountCents: 0, distanceKm: 124,
    score: 0, detour: { distanceKm: 4, durationMinutes: 6 } },
  { id: "direct", brand: "Parada con menos desvío", address: "Calle directa 2", locality: "Sevilla",
    latitude: 37.4, longitude: -5.9, originalPrice: 1.6, finalPrice: 1.6, discountCents: 0, distanceKm: 9,
    score: 0, detour: { distanceKm: 1, durationMinutes: 2 } },
];
const result = { stations, baseRoute: { distanceKm: 140, durationMinutes: 90 },
  evaluatedCount: 12, candidateCount: 54, sourceUpdatedAt: "10/10/2026 13:53:43" };

async function enterJourney(page: Page) {
  await page.route("**/api/locations?**", route => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const isOrigin = query === "Sevilla";
    return route.fulfill({ json: { source: "photon", locations: [{ id: isOrigin ? "seville" : "cordoba",
      type: "photon", source: "photon", label: isOrigin ? "Sevilla" : "Córdoba", municipality: isOrigin ? "Sevilla" : "Córdoba",
      province: isOrigin ? "Sevilla" : "Córdoba", precision: "area", position: isOrigin ? origin : destination }] } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "En ruta", exact: true }).click();
  await page.getByLabel("Origen", { exact: true }).fill("Sevilla");
  await page.getByLabel("Origen", { exact: true }).press("Enter");
  await page.getByRole("button", { name: /Sevilla.*Zona/ }).click();
  await page.getByLabel("Destino", { exact: true }).fill("Córdoba");
  await page.getByLabel("Destino", { exact: true }).press("Enter");
  await page.getByRole("button", { name: /Córdoba.*Zona/ }).click();
}

test("busca el trayecto, muestra kilómetros y minutos extra y navega con una parada", async ({ page }, testInfo) => {
  let calls = 0;
  await page.route("**/api/journey", route => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ origin, destination, maximumDetourKm: 5,
      selection: { family: "gasoline", grade: "normal" }, discounts: [] });
    return route.fulfill({ json: result });
  });
  await enterJourney(page);
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  const heading = page.getByRole("heading", { name: "2 estaciones encontradas en ruta" });
  await expect(heading).toBeInViewport();
  await expect(page.getByText(/Trayecto sin parada: 140,0 km · 90 min/)).toBeVisible();
  await expect(page.getByText(/Evaluadas 12 de 54 estaciones/)).toBeVisible();
  const best = page.getByRole("region", { name: "Mejor opción", exact: true });
  await expect(best.getByRole("heading", { level: 3 }).first()).toHaveText("Barata al final del viaje");
  await expect(best.getByText("+4,0 km · +6 min", { exact: true })).toBeVisible();
  const navigation = new URL((await best.getByRole("link").first().getAttribute("href"))!);
  expect(navigation.searchParams.get("origin")).toBe("37.4,-6");
  expect(navigation.searchParams.get("destination")).toBe("37.4,-4.5");
  expect(navigation.searchParams.get("waypoints")).toBe("37.4,-4.6");
  await page.getByRole("button", { name: "Desvío", exact: true }).click();
  await expect(best.getByRole("heading", { level: 3 }).first()).toHaveText("Parada con menos desvío");
  expect(calls).toBe(1);
  await expect(page.getByLabel("Litros previstos")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Calcular ahorro neto" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("journey-results.png"), fullPage: true });
});

test("editar destino o desvío invalida resultados y exige seleccionar de nuevo el lugar", async ({ page }) => {
  const requests: unknown[] = [];
  await page.route("**/api/journey", route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ json: result });
  });
  await enterJourney(page);
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 estaciones encontradas en ruta" })).toBeVisible();
  await page.getByLabel("Destino", { exact: true }).fill("Córdoba centro");
  await expect(page.getByRole("heading", { name: "2 estaciones encontradas en ruta" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true })).toBeDisabled();
  await page.getByLabel("Destino", { exact: true }).press("Enter");
  await page.getByRole("button", { name: /Córdoba.*Zona/ }).click();
  await page.getByRole("button", { name: "+10", exact: true }).click();
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 estaciones encontradas en ruta" })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toMatchObject({ maximumDetourKm: 10 });
  await page.reload();
  await page.getByRole("button", { name: "En ruta", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Desvío máximo en kilómetros" })).toHaveValue("10");
  await expect(page.getByLabel("Origen", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Destino", { exact: true })).toHaveValue("");
});

test("se recupera de errores y de una búsqueda sin estaciones dentro del desvío", async ({ page }) => {
  await page.route("**/api/journey", route => route.fulfill({ status: 502, json: { error: "No se pudo completar la búsqueda en ruta." } }));
  await enterJourney(page);
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No hemos podido completar" })).toContainText("No se pudo completar la búsqueda en ruta.");
  await page.route("**/api/journey", route => route.fulfill({ json: { ...result, stations: [] } }));
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No hay estaciones disponibles" })).toBeInViewport();
  await expect(page.getByText(/Ninguna de las estaciones evaluadas cumple/)).toBeVisible();
  await page.getByRole("button", { name: "Cerca de mí", exact: true }).click();
  await expect(page.getByLabel("O busca por municipio")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No hay estaciones disponibles" })).toHaveCount(0);
});

test("cambiar de modo cancela una búsqueda de ruta y descarta su respuesta tardía", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/journey", async route => {
    await gate;
    await route.fulfill({ json: result }).catch(() => {});
  });
  await enterJourney(page);
  await page.getByRole("button", { name: "Buscar estaciones en ruta", exact: true }).click();
  await expect(page.getByRole("button", { name: "Buscando estaciones en ruta…" })).toBeDisabled();
  await page.getByRole("button", { name: "Cerca de mí", exact: true }).click();
  release();
  await expect(page.getByRole("heading", { name: "2 estaciones encontradas en ruta" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buscar cerca de mí" })).toBeEnabled();
});
