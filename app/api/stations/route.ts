import { unstable_cache } from "next/cache";
import { gunzipSync, gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import {
  haversineDistance,
  MAX_RADIUS_KM,
  parseSpanishNumber,
} from "@/lib/stations";
import type { RawStation, UserPosition } from "@/lib/types";

const MINISTRY_API =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";
const FILTER_RADIUS_KM = MAX_RADIUS_KM + 0.2;

const STATION_FIELDS = [
  "IDEESS",
  "R\u00f3tulo",
  "Direcci\u00f3n",
  "Localidad",
  "Municipio",
  "C.P.",
  "Latitud",
  "Longitud (WGS84)",
  "Precio Gasolina 95 E5",
  "Precio Gasolina 98 E5",
  "Precio Gasoleo A",
  "Precio Gasoleo Premium",
] as const;

type MinistryPayload = {
  ListaEESSPrecio?: unknown;
  Fecha?: unknown;
};

type CachedMinistryPayload = {
  compressedPayload: string;
};

export const runtime = "nodejs";
export const preferredRegion = "fra1";
export const maxDuration = 60;

const getCompressedMinistryPayload = unstable_cache(
  async (): Promise<CachedMinistryPayload> => {
    const response = await fetch(MINISTRY_API, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CombustibleZC/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      throw new Error("El Ministerio respondi\u00f3 con estado " + response.status);
    }

    return {
      compressedPayload: gzipSync(
        Buffer.from(await response.arrayBuffer()),
      ).toString("base64"),
    };
  },
  ["miteco-stations-compressed-v1"],
  { revalidate: 900 },
);

async function getMinistryData(): Promise<{
  stations: RawStation[];
  sourceUpdatedAt: string | null;
}> {
  const { compressedPayload } = await getCompressedMinistryPayload();
  const payload = JSON.parse(
    gunzipSync(Buffer.from(compressedPayload, "base64")).toString("utf8"),
  ) as MinistryPayload;

  if (!Array.isArray(payload.ListaEESSPrecio)) {
    throw new Error("La respuesta del Ministerio no contiene una lista v\u00e1lida");
  }

  return {
    stations: payload.ListaEESSPrecio.filter(
      (station): station is RawStation =>
        typeof station === "object" && station !== null,
    ),
    sourceUpdatedAt: typeof payload.Fecha === "string" ? payload.Fecha : null,
  };
}

function getPosition(request: NextRequest): UserPosition | null {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

function compactNearbyStations(
  stations: RawStation[],
  userPosition: UserPosition,
): RawStation[] {
  return stations.flatMap((station) => {
    const latitude = parseSpanishNumber(station.Latitud);
    const longitude = parseSpanishNumber(station["Longitud (WGS84)"]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return [];
    }

    const distanceKm = haversineDistance(userPosition, {
      latitude,
      longitude,
    });

    if (distanceKm > FILTER_RADIUS_KM) {
      return [];
    }

    const compactStation: RawStation = {};
    for (const field of STATION_FIELDS) {
      const value = station[field];
      if (typeof value === "string") {
        compactStation[field] = value;
      }
    }

    return [compactStation];
  });
}

export async function GET(request: NextRequest) {
  const userPosition = getPosition(request);

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
