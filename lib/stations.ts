import type {
  Discount,
  FuelSelection,
  RawStation,
  ResultLists,
  StationResult,
  UserPosition,
} from "@/lib/types";

export const DEFAULT_RADIUS_KM = 15;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;
export const RADIUS_PRESETS = [5, 10, 15, 25, 50] as const;
export const DEFAULT_PRICE_WEIGHT = 70;

export const FUEL_KEYS: Record<string, string> = {
  "gasoline-normal": "Precio Gasolina 95 E5",
  "gasoline-premium": "Precio Gasolina 98 E5",
  "diesel-normal": "Precio Gasoleo A",
  "diesel-premium": "Precio Gasoleo Premium",
};

export function parseSpanishNumber(value?: string): number {
  if (!value) return Number.NaN;
  return Number.parseFloat(value.trim().replace(",", "."));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistance(
  origin: UserPosition,
  destination: UserPosition,
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function applicableDiscount(brand: string, discounts: Discount[]): number {
  const normalizedBrand = brand.toLocaleUpperCase("es-ES");

  return discounts.reduce((largestDiscount, discount) => {
    const searchedBrand = discount.brand.trim().toLocaleUpperCase("es-ES");
    const cents = Number.parseFloat(discount.cents.replace(",", "."));

    if (
      searchedBrand &&
      Number.isFinite(cents) &&
      cents > 0 &&
      normalizedBrand.includes(searchedBrand)
    ) {
      return Math.max(largestDiscount, cents);
    }

    return largestDiscount;
  }, 0);
}

function normalize(value: number, minimum: number, maximum: number): number {
  if (maximum === minimum) return 0;
  return (value - minimum) / (maximum - minimum);
}

export function processStations(
  rawStations: RawStation[],
  selection: FuelSelection,
  discounts: Discount[],
  userPosition: UserPosition,
  maximumDistanceKm = DEFAULT_RADIUS_KM,
  priceWeight = DEFAULT_PRICE_WEIGHT,
): ResultLists {
  const fuelKey = FUEL_KEYS[`${selection.family}-${selection.grade}`];

  const nearbyStations: StationResult[] = rawStations.flatMap(
    (station, index) => {
      const originalPrice = parseSpanishNumber(station[fuelKey]);
      const latitude = parseSpanishNumber(station.Latitud);
      const longitude = parseSpanishNumber(station["Longitud (WGS84)"]);

      if (
        !Number.isFinite(originalPrice) ||
        originalPrice <= 0 ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return [];
      }

      const distanceKm = haversineDistance(userPosition, {
        latitude,
        longitude,
      });

      if (distanceKm > maximumDistanceKm) return [];

      const brand = station["Rótulo"]?.trim() || "Sin rótulo";
      const discountCents = applicableDiscount(brand, discounts);
      const finalPrice = Math.max(0, originalPrice - discountCents / 100);

      return [
        {
          id:
            station["IDEESS"] ||
            `${station["C.P."]}-${latitude}-${longitude}-${index}`,
          brand,
          address: station.Dirección?.trim() || "Dirección no disponible",
          locality: station.Localidad?.trim() || station.Municipio?.trim() || "",
          latitude,
          longitude,
          originalPrice,
          finalPrice,
          discountCents,
          distanceKm,
          score: 0,
        },
      ];
    },
  );

  if (nearbyStations.length === 0) {
    return { cheapest: [], nearest: [], smartest: [] };
  }

  const prices = nearbyStations.map((station) => station.finalPrice);
  const distances = nearbyStations.map((station) => station.distanceKm);
  const minimumPrice = Math.min(...prices);
  const maximumPrice = Math.max(...prices);
  const minimumDistance = Math.min(...distances);
  const maximumDistance = Math.max(...distances);

  const safePriceWeight = Math.min(100, Math.max(0, priceWeight)) / 100;
  const distanceWeight = 1 - safePriceWeight;

  const scoredStations = nearbyStations.map((station) => {
    const normalizedPrice = normalize(
      station.finalPrice,
      minimumPrice,
      maximumPrice,
    );
    const normalizedDistance = normalize(
      station.distanceKm,
      minimumDistance,
      maximumDistance,
    );
    const weightedCost =
      normalizedPrice * safePriceWeight +
      normalizedDistance * distanceWeight;

    return {
      ...station,
      score: Math.round((1 - weightedCost) * 100),
    };
  });

  return {
    cheapest: [...scoredStations].sort(
      (a, b) => a.finalPrice - b.finalPrice || a.distanceKm - b.distanceKm,
    ),
    nearest: [...scoredStations].sort(
      (a, b) => a.distanceKm - b.distanceKm || a.finalPrice - b.finalPrice,
    ),
    smartest: [...scoredStations].sort(
      (a, b) =>
        b.score - a.score ||
        a.finalPrice - b.finalPrice ||
        a.distanceKm - b.distanceKm,
    ),
  };
}
