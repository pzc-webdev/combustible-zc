import { NextRequest, NextResponse } from "next/server";
import { haversineDistance, MAX_RADIUS_KM, parseSpanishNumber } from "@/lib/stations";
import { isValidPosition, positionFromParams } from "@/lib/geo";
import { compactStation, getMinistryData } from "@/lib/server/ministry";
import type { RawStation, UserPosition } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
const FILTER_RADIUS_KM = MAX_RADIUS_KM + 0.2;

function compactNearbyStations(
  stations: RawStation[],
  userPosition: UserPosition,
): RawStation[] {
  return stations.flatMap((station) => {
    const latitude = parseSpanishNumber(station.Latitud);
    const longitude = parseSpanishNumber(station["Longitud (WGS84)"]);

    if (!isValidPosition({ latitude, longitude })) {
      return [];
    }

    const distanceKm = haversineDistance(userPosition, {
      latitude,
      longitude,
    });

    if (distanceKm > FILTER_RADIUS_KM) {
      return [];
    }

    return [compactStation(station)];
  });
}

export async function GET(request: NextRequest) {
  const userPosition = positionFromParams(request.nextUrl.searchParams);

  if (!userPosition) {
    return NextResponse.json(
      { error: "Indica una ubicaci\u00f3n v\u00e1lida para buscar estaciones." },
      { status: 400 },
    );
  }

  try {
    const { stations, sourceUpdatedAt } = await getMinistryData();

    return NextResponse.json({
      stations: compactNearbyStations(stations, userPosition),
      sourceUpdatedAt,
    });
  } catch (error) {
    console.error("No se pudieron obtener las estaciones:", error);

    return NextResponse.json(
      {
        error:
          "No se pudieron cargar ahora mismo los precios oficiales. Int\u00e9ntalo de nuevo en unos minutos.",
      },
      { status: 502 },
    );
  }
}
