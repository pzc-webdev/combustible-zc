import { NextRequest, NextResponse } from "next/server";
import { MAX_LOCATION_QUERY, MIN_LOCATION_QUERY } from "@/lib/geocoding";
import { GeocoderBusyError, searchPhoton } from "@/lib/server/photon";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const headers = { "Cache-Control": "no-store" };
  if (query.length < MIN_LOCATION_QUERY || query.length > MAX_LOCATION_QUERY) {
    return NextResponse.json({ error: "Escribe entre 3 y 160 caracteres para buscar una ubicación." }, { status: 400, headers });
  }
  try {
    const locations = await searchPhoton(query, request.signal);
    return NextResponse.json({ locations, source: "photon" }, { headers });
  } catch (error) {
    const busy = error instanceof GeocoderBusyError;
    return NextResponse.json({ error: busy
      ? "Hay muchas búsquedas de ubicaciones. Espera unos segundos y vuelve a intentarlo."
      : "No se pudieron buscar ubicaciones. Inténtalo de nuevo o usa tu ubicación actual." },
    { status: busy ? 429 : 502, headers: { ...headers, ...(busy ? { "Retry-After": "5" } : {}) } });
  }
}
