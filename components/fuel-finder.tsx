"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  RotateCw,
} from "lucide-react";
import { DiscountManager } from "@/components/discount-manager";
import { FuelSelector } from "@/components/fuel-selector";
import { RadiusSelector } from "@/components/radius-selector";
import { ResultsBoard } from "@/components/results-board";
import { ScoreWeightSelector } from "@/components/score-weight-selector";
import {
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  processStations,
} from "@/lib/stations";
import type {
  Discount,
  FuelSelection,
  RawStation,
  ResultLists,
  UserPosition,
} from "@/lib/types";

const DISCOUNTS_STORAGE_KEY = "combustible-zc-discounts";
const RADIUS_STORAGE_KEY = "combustible-zc-radius";

type SearchStatus = "idle" | "locating" | "loading" | "success" | "error";

const EMPTY_RESULTS: ResultLists = {
  cheapest: [],
  nearest: [],
  smartest: [],
};

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "No tenemos permiso para acceder a tu ubicación. Actívalo en los ajustes del navegador y vuelve a intentarlo.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Tu ubicación no está disponible ahora mismo. Comprueba que la localización del dispositivo esté activada.";
  }
  if (error.code === error.TIMEOUT) {
    return "La localización está tardando demasiado. Inténtalo de nuevo en un lugar con mejor cobertura.";
  }
  return "No hemos podido obtener tu ubicación.";
}

function locateUser(): Promise<UserPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error("Este navegador no permite obtener la ubicación del dispositivo."),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      (error) => reject(new Error(geolocationErrorMessage(error))),
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
    );
  });
}

export function FuelFinder() {
  const [selection, setSelection] = useState<FuelSelection>({
    family: "gasoline",
    grade: "normal",
  });
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [priceWeight, setPriceWeight] = useState(DEFAULT_PRICE_WEIGHT);
  const [rawStations, setRawStations] = useState<RawStation[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState("");
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(DISCOUNTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setDiscounts(parsed);
        }
        const savedRadius = Number(localStorage.getItem(RADIUS_STORAGE_KEY));
        if (
          Number.isFinite(savedRadius) &&
          savedRadius >= MIN_RADIUS_KM &&
          savedRadius <= MAX_RADIUS_KM
        ) {
          setRadiusKm(savedRadius);
        }
      } catch {
        localStorage.removeItem(DISCOUNTS_STORAGE_KEY);
      } finally {
        setHasLoadedStorage(true);
      }
    }, 0);

    return () => window.clearTimeout(storageTimer);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem(DISCOUNTS_STORAGE_KEY, JSON.stringify(discounts));
  }, [discounts, hasLoadedStorage]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    localStorage.setItem(RADIUS_STORAGE_KEY, String(radiusKm));
  }, [hasLoadedStorage, radiusKm]);

  const results = useMemo(() => {
    if (!userPosition || rawStations.length === 0) return EMPTY_RESULTS;
    return processStations(
      rawStations,
      selection,
      discounts,
      userPosition,
      radiusKm,
      priceWeight,
    );
  }, [discounts, priceWeight, radiusKm, rawStations, selection, userPosition]);

  const search = async () => {
    setError("");
    setStatus("locating");

    try {
      const position = await locateUser();
      setUserPosition(position);
      setStatus("loading");

      const searchParams = new URLSearchParams({
        lat: position.latitude.toFixed(5),
        lng: position.longitude.toFixed(5),
      });
      const response = await fetch("/api/stations?" + searchParams.toString());
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los precios.");
      }

      setRawStations(payload.stations);
      setSourceUpdatedAt(payload.sourceUpdatedAt);
      setStatus("success");
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Ha ocurrido un error inesperado.",
      );
      setStatus("error");
    }
  };

  const isSearching = status === "locating" || status === "loading";
  const hasResults = status === "success" && results.cheapest.length > 0;
  const noResults = status === "success" && results.cheapest.length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#F4F0E8] text-[#17212B]">
      <main className="relative flex-1 overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7 lg:px-10">

          <span className="text-sm font-extrabold tracking-[-0.035em] text-[#17212B] sm:text-base">
            combustible<span className="text-[var(--action)]">zc</span>
          </span>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:px-10">
        <section className="relative mx-auto max-w-5xl px-2 py-8 text-center sm:px-10 sm:py-10">
          <h1 className="text-balance text-[2.35rem] font-extrabold leading-[1.02] tracking-[-0.065em] text-[#17212B] sm:text-6xl">
            Mejora tu ahorro con solo {" "}
            <span className="text-[var(--action)]">unos cuantos clics.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-[#44505A] sm:text-lg">
            La gasolinera más cercana no siempre es la mejor opción.
          </p>
        </section>

        <section
          className="configurator mx-auto mt-4 grid max-w-6xl overflow-hidden lg:mt-5 lg:grid-cols-12"
          aria-label="Preferencias de búsqueda"
        >
          <div className="config-step config-step-fuel lg:col-span-7">
            <FuelSelector
              value={selection}
              onChange={setSelection}
              disabled={isSearching}
            />
          </div>
          <div className="config-step config-step-radius lg:col-span-5">
            <RadiusSelector
              value={radiusKm}
              onChange={setRadiusKm}
              disabled={isSearching}
            />
          </div>
          <div className="config-step config-step-score lg:col-span-12">
            <ScoreWeightSelector
              priceWeight={priceWeight}
              onChange={setPriceWeight}
              disabled={isSearching}
            />
          </div>
          <div className="config-step config-step-discounts lg:col-span-12">
            <DiscountManager
              discounts={discounts}
              onChange={setDiscounts}
              disabled={isSearching}
            />
          </div>
          <section className="config-action relative overflow-hidden bg-[#143642] px-5 py-6 text-center sm:px-7 lg:col-span-12">
          <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-8 size-32 rounded-full border border-white/10" />
          <p className="relative mb-3 font-[var(--font-ibm-plex-mono)] text-[11px] font-medium tracking-[0.08em] text-white/65">
            {selection.family === "gasoline" ? "GASOLINA" : "GASOIL"} · {selection.grade === "normal" ? "NORMAL" : "PREMIUM"} · {radiusKm} KM · PRECIO {priceWeight}%
          </p>
          <button
            type="button"
            onClick={search}
            disabled={isSearching}
            className="search-button"
          >
            {isSearching ? (
              <LoaderCircle className="animate-spin" size={21} aria-hidden="true" />
            ) : status === "success" ? (
              <RotateCw size={20} aria-hidden="true" />
            ) : (
              <LocateFixed size={21} aria-hidden="true" />
            )}
            {status === "locating"
              ? "Obteniendo ubicación…"
              : status === "loading"
                ? "Consultando precios…"
                : status === "success"
                  ? "Actualizar mi búsqueda"
                  : "Buscar cerca de mí"}
          </button>
          <p className="relative mt-3 text-[11px] text-white/60">
            Tu ubicación solo se utiliza para calcular distancias y limitar los
            resultados a tu zona.
          </p>
          </section>
        </section>

        {status === "error" && (
          <div
            role="alert"
            className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-left text-sm leading-6 text-red-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
            <div>
              <p className="font-bold">No hemos podido completar la búsqueda</p>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {noResults && (
          <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[#D8D2C8] bg-[#FFFCF5] px-6 py-10 text-center shadow-[0_14px_30px_rgba(23,33,43,0.06)]">
            <MapPinned className="mx-auto text-[#2B7A9A]" size={34} aria-hidden="true" />
            <h2 className="mt-4 font-bold text-[#17212B]">
              No hay estaciones disponibles
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#44505A]">
              No encontramos estaciones con precio para este combustible a
              menos de {radiusKm} km. Prueba otra variante o amplía el radio.
            </p>
          </div>
        )}

        {hasResults && (
          <ResultsBoard
            lists={results}
            sourceUpdatedAt={sourceUpdatedAt}
            radiusKm={radiusKm}
            priceWeight={priceWeight}
          />
        )}
      </div>
      </main>

      <footer className="border-t border-[#D8D2C8] bg-[#FFFCF5]/55">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-[#44505A] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>Precios del Ministerio para la Transición Ecológica de España.</p>
          <p>El precio final es orientativo y depende de tu descuento.</p>
        </div>
        <div className="hub-footer">
          <span />
          <p>pzcdev</p>
          <span />
        </div>
      </footer>
    </div>
  );
}
