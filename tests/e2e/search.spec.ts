import { test, expect, type Page } from "@playwright/test";

const locations = [
  { id: "28013", type: "photon", source: "photon", position: { latitude: 40.418, longitude: -3.71 }, label: "28013", municipality: "", province: "", precision: "area" },
  { id: "28079", type: "photon", source: "photon", position: { latitude: 40.418, longitude: -3.71 }, label: "Madrid", municipality: "Madrid", province: "Madrid", precision: "area" },
];
const stations = [{ IDEESS: "1", "Rótulo": "Estación de prueba", "Dirección": "Calle de prueba 1",
  Municipio: "Madrid", Latitud: "40,42", "Longitud (WGS84)": "-3,70",
  "Precio Gasolina 95 E5": "1,50", "Precio Gasoleo Premium": "1,40" }];

async function mockSearch(page: Page) {
  await page.route("**/api/locations?**", route => route.fulfill({ json: { locations } }));
  await page.route("**/api/stations?**", route => route.fulfill({ json: { stations, sourceUpdatedAt: "20/09/2026 12:00:00" } }));
}

test("selecciona las coordenadas de Photon sin otra petición de ubicación", async ({ page }) => {
  await mockSearch(page);
  await page.route("**/api/locations?**", route => route.fulfill({ json: {
    source: "photon", locations: [{ id: "postcode:41020", type: "photon", source: "photon",
      label: "41020, Sevilla", municipality: "Sevilla", province: "Sevilla", precision: "area",
      position: { latitude: 40.418, longitude: -3.71 } }],
  } }));
  let locationCalls = 0;
  page.on("request", request => { if (request.url().includes("/api/locations")) locationCalls++; });
  await page.goto("/");
  await page.getByLabel("O busca por municipio").fill("41020");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("link", { name: "© OpenStreetMap contributors" })).toBeVisible();
  await page.getByRole("button", { name: /41020, Sevilla/ }).click();
  await expect(page.getByRole("heading", { name: "1 estación encontrada" })).toBeVisible();
  expect(locationCalls).toBe(1);
});

test("busca manualmente con teclado sin pedir geolocalización y avisa de la precisión", async ({ page }, testInfo) => {
  await mockSearch(page);
  let stationCalls = 0;
  page.on("request", request => { if (request.url().includes("/api/stations?")) stationCalls++; });
  await page.goto("/");
  await page.getByLabel("O busca por municipio").fill("28013");
  await page.getByLabel("O busca por municipio").press("Enter");
  await expect(page.getByRole("list", { name: "Ubicaciones encontradas" })).toBeVisible();
  expect(stationCalls).toBe(0);
  await page.getByRole("button", { name: /28013/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "1 estación encontrada" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 estación encontrada" })).toBeInViewport();
  await expect.poll(() => page.getByRole("heading", { name: "1 estación encontrada" })
    .evaluate(heading => heading.getBoundingClientRect().top / window.innerHeight)).toBeLessThan(0.5);
  await expect(page.getByText(/Ubicación aproximada de la zona; indica/)).toBeVisible();
  await expect(page.getByText("100 pts", { exact: true })).toHaveCount(0);
  expect(stationCalls).toBe(1);
  const requestUrl = new URL((await page.evaluate(() => performance.getEntriesByType("resource").map(r => r.name))).find(url => url.includes("/api/stations?"))!);
  expect(requestUrl.searchParams.get("lat")).toBe("40.41800");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("manual-search.png"), fullPage: true });
});

test("conserva preferencias tras recargar y migra las antiguas", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("combustible-zc-preferences"))).not.toBeNull();
  await page.evaluate(() => {
    localStorage.removeItem("combustible-zc-preferences");
    localStorage.setItem("combustible-zc-discounts", JSON.stringify([{ id: "1", brand: "Repsol", cents: "8" }, null]));
    localStorage.setItem("combustible-zc-radius", "25");
  });
  await page.reload();
  await expect(page.getByRole("slider", { name: /Radio máximo/ })).toHaveValue("25");
  await page.getByRole("button", { name: "Gasoil", exact: true }).click();
  await page.getByRole("button", { name: "Premium", exact: true }).click();
  await page.getByRole("button", { name: "Equilibrado", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("combustible-zc-preferences")!).priceWeight)).toBe(50);
  await page.reload();
  await expect(page.getByRole("button", { name: "Gasoil", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Premium", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: /Peso del precio/ })).toHaveValue("50");
  await page.getByText("Mis descuentos", { exact: true }).click();
  await expect(page.getByLabel("Marca", { exact: true }).first()).toHaveValue("Repsol");
});

test("funciona con almacenamiento bloqueado y permiso de ubicación denegado", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage blocked"); } });
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: (_success: unknown, reject: (error: { code: number; PERMISSION_DENIED: number }) => void) => reject({ code: 1, PERMISSION_DENIED: 1 }),
    } });
  });
  await mockSearch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Buscar cerca de mí" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No hemos podido completar" })).toContainText("Puedes buscar por municipio");
  await page.getByLabel("O busca por municipio").fill("Madrid");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: /Madrid/ }).click();
  await expect(page.getByRole("heading", { name: "1 estación encontrada" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("no aplica ni guarda descuentos inválidos al editarlos", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Mis descuentos", { exact: true }).click();
  await page.getByLabel("Marca", { exact: true }).fill("Repsol");
  await page.getByLabel("Cént./L", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Añadir descuento" }).click();
  await page.getByLabel("Cént./L", { exact: true }).first().fill("150");
  await expect(page.getByText(/Este descuento no se aplica ni se guarda/)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("combustible-zc-preferences")!).discounts)).toEqual([]);
  await page.getByLabel("Cént./L", { exact: true }).first().fill("10");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("combustible-zc-preferences")!).discounts.length)).toBe(1);
});

test("ofrece recuperación cuando no hay coincidencias o falla el proveedor", async ({ page }) => {
  await page.route("**/api/locations?**", route => route.fulfill({ json: { locations: [] } }));
  await page.goto("/");
  await page.getByLabel("O busca por municipio").fill("Lugar inexistente");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText(/No encontramos esa ubicación/)).toBeVisible();
  await page.route("**/api/locations?**", route => route.fulfill({ status: 502, json: { error: "Servicio no disponible. Inténtalo de nuevo." } }));
  await page.getByLabel("O busca por municipio").fill("Madrid");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Servicio no disponible. Inténtalo de nuevo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Buscar cerca de mí" })).toBeEnabled();
});

test("descarta búsquedas obsoletas al editar la consulta", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/locations?**", async route => {
    await gate;
    await route.fulfill({ json: { locations } }).catch(() => {});
  });
  await page.goto("/");
  await page.getByLabel("O busca por municipio").fill("Madrid");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Buscando ubicaciones…")).toBeVisible();
  await page.getByLabel("O busca por municipio").fill("Sevilla");
  release();
  await expect(page.getByRole("list", { name: "Ubicaciones encontradas" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeEnabled();
});

test("descarta coordenadas inválidas y permite elegir una dirección válida", async ({ page }) => {
  await mockSearch(page);
  await page.route("**/api/locations?**", route => route.fulfill({ json: { source: "photon", locations: [
    { id: "invalid", type: "photon", source: "photon", label: "Resultado incompleto", precision: "address" },
    { id: "house-1", type: "photon", source: "photon", label: "CALLE ALCALA 1, Madrid", municipality: "Madrid", province: "Madrid", precision: "address",
      position: { latitude: 40.417, longitude: -3.702 } },
  ] } }));
  await page.goto("/");
  await page.getByLabel("O busca por municipio").fill("Calle Alcalá 1 Madrid");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: /Resultado incompleto/ }).click();
  await expect(page.getByText("No se pudo localizar ese resultado. Prueba con otra ubicación.")).toBeVisible();
  await page.getByRole("button", { name: /CALLE ALCALA/ }).click();
  await expect(page.getByRole("heading", { name: "1 estación encontrada" })).toBeVisible();
  await expect(page.getByText(/Ubicación aproximada de la zona; indica/)).toHaveCount(0);
});
