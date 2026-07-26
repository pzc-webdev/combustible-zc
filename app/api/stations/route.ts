import { NextResponse } from "next/server";

const MINISTRY_API =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

export const runtime = "nodejs";
// El origen del MITECO está en Europa. Evita ejecutar por defecto en IAD,
// donde la conexión con este servicio ha agotado el tiempo de espera.
export const preferredRegion = "fra1";
export const maxDuration = 60;

export async function GET() {
  try {
    const response = await fetch(MINISTRY_API, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CombustibleZC/1.0",
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      throw new Error(`El Ministerio respondió con estado ${response.status}`);
    }

    const payload = await response.json();
    const stations = payload?.ListaEESSPrecio;

    if (!Array.isArray(stations)) {
      throw new Error("La respuesta del Ministerio no contiene una lista válida");
    }

    return NextResponse.json(
      {
        stations,
        sourceUpdatedAt: payload?.Fecha ?? null,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    console.error("No se pudieron obtener las estaciones:", error);

    return NextResponse.json(
      {
        error:
          "No se pudieron cargar ahora mismo los precios oficiales. Inténtalo de nuevo en unos minutos.",
      },
      { status: 502 },
    );
  }
}
