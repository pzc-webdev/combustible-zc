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
