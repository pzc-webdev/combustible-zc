import { unstable_cache } from "next/cache";
import { gunzipSync, gzipSync } from "node:zlib";
import type { RawStation } from "../types";

const MINISTRY_API =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

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

export async function getMinistryData(): Promise<{
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

export function compactStation(station: RawStation): RawStation {
  const compact: RawStation = {};
  for (const field of STATION_FIELDS) {
    if (typeof station[field] === "string") compact[field] = station[field];
  }
  return compact;
}
