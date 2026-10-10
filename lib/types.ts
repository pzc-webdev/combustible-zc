export type FuelFamily = "gasoline" | "diesel";
export type FuelGrade = "normal" | "premium";

export type FuelSelection = {
  family: FuelFamily;
  grade: FuelGrade;
};

export type Discount = {
  id: string;
  brand: string;
  cents: string;
};

export type UserPosition = {
  latitude: number;
  longitude: number;
};

export type LocationPrecision = "address" | "street" | "area";
export type LocationCandidate = {
  id: string;
  type: string;
  label: string;
  municipality: string;
  province: string;
  precision: LocationPrecision;
  source: "photon";
  position: UserPosition;
};
export type SearchLocation = UserPosition & {
  label: string;
  precision: LocationPrecision | "device";
};

export type RawStation = Record<string, string>;

export type StationResult = {
  id: string;
  brand: string;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
  originalPrice: number;
  finalPrice: number;
  discountCents: number;
  distanceKm: number;
  score: number;
};

export type ResultLists = {
  cheapest: StationResult[];
  nearest: StationResult[];
  smartest: StationResult[];
};
