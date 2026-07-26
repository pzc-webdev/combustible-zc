import { NextResponse } from "next/server";

const MINISTRY_API =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetch(MINISTRY_API, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CombustibleCerca/1.0",
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`El Ministerio respondió con estado ${response.status}`);
    }

    const payload = await response.json();
    const stations = payload?.ListaEESSPrecio;

    if (!Array.isArray(stations)) {
      throw new Error("La respuesta del Ministerio no contiene una lista válida");
    }

    return NextResponse.json({
      stations,
      sourceUpdatedAt: payload?.Fecha ?? null,
    });
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
