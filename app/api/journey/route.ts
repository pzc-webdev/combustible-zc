import { NextRequest, NextResponse } from "next/server";
import { sanitizeDiscounts } from "@/lib/discounts";
import { journeyCandidates, validJourneyRequest } from "@/lib/journey";
import { findJourneyStations, JourneyBusyError } from "@/lib/server/journey-router";
import { getMinistryData } from "@/lib/server/ministry";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 12_000) throw new Error("Petición demasiado grande");
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "La búsqueda en ruta no es válida." }, { status: 400, headers });
  }
  if (!validJourneyRequest(input)) return NextResponse.json({ error: "Selecciona origen y destino distintos y un desvío entre 0 y 20 km." }, { status: 400, headers });
  const search = { ...input, discounts: sanitizeDiscounts(input.discounts) };
  try {
    request.signal.throwIfAborted();
    const prices = getMinistryData().then(data => ({ data }), error => ({ error }));
    let sourceUpdatedAt: string | null = null;
    const result = await findJourneyStations(search, async base => {
      const loaded = await prices;
      if ("error" in loaded) throw loaded.error;
      const data = loaded.data;
      sourceUpdatedAt = data.sourceUpdatedAt;
      request.signal.throwIfAborted();
      return journeyCandidates(data.stations, search, base);
    }, request.signal);
    return NextResponse.json({ ...result, sourceUpdatedAt }, { headers });
  } catch (error) {
    const busy = error instanceof JourneyBusyError;
    return NextResponse.json({ error: busy ? "El servicio de rutas está ocupado. Espera unos segundos y vuelve a buscar."
      : "No se pudo completar la búsqueda en ruta. Vuelve a intentarlo o utiliza Cerca de mí." },
    { status: busy ? 429 : 502, headers: { ...headers, ...(busy ? { "Retry-After": "2" } : {}) } });
  }
}
