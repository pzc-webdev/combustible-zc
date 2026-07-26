"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Fuel,
  LoaderCircle,
  LocateFixed,
  MapPinned,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { DiscountManager } from "@/components/discount-manager";
import { FuelSelector } from "@/components/fuel-selector";
import { RadiusSelector } from "@/components/radius-selector";
import { ResultsBoard } from "@/components/results-board";
import {
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

const DISCOUNTS_STORAGE_KEY = "combustible-cerca-discounts";
const RADIUS_STORAGE_KEY = "combustible-cerca-radius";

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
    );
  }, [discounts, radiusKm, rawStations, selection, userPosition]);

  const search = async () => {
    setError("");
    setStatus("locating");

    try {
      const position = await locateUser();
      setUserPosition(position);
      setStatus("loading");

      const response = await fetch("/api/stations");
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
    <div className="flex min-h-dvh flex-col">
      <main className="relative flex-1 overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <a href="#" className="flex items-center gap-2.5" aria-label="Inicio">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <Fuel size={19} aria-hidden="true" />
          </span>
          <span className="text-sm font-extrabold tracking-[-0.02em] text-slate-900 sm:text-base">
            combustible<span className="text-emerald-600">cerca</span>
          </span>
        </a>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 sm:text-xs">
          <ShieldCheck size={15} className="text-emerald-600" aria-hidden="true" />
          Datos oficiales
        </span>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 pt-7 sm:px-8 sm:pb-20 sm:pt-16 lg:px-10">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <MapPinned size={14} aria-hidden="true" />
            Compara precios reales en {radiusKm} km
          </div>
          <h1 className="text-balance text-[2.35rem] font-extrabold leading-[1.05] tracking-[-0.055em] text-slate-950 sm:text-6xl">
            Repostar bien también es{" "}
            <span className="text-emerald-600">elegir mejor.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-slate-500 sm:text-lg">
            Encuentra el mejor equilibrio entre precio y distancia, incluyendo
            los descuentos que ya tienes.
          </p>
        </section>

        <section
          className="mx-auto mt-8 grid max-w-4xl gap-4 sm:mt-10 "
          aria-label="Preferencias de búsqueda"
        >
          <FuelSelector
            value={selection}
            onChange={setSelection}
            disabled={isSearching}
          />
          <div className="space-y-4">
            <RadiusSelector
              value={radiusKm}
              onChange={setRadiusKm}
              disabled={isSearching}
            />
            <DiscountManager
              discounts={discounts}
              onChange={setDiscounts}
              disabled={isSearching}
            />
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-xl text-center">
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
          <p className="mt-3 text-xs text-slate-400">
            Tu ubicación solo se utiliza para calcular distancias.
          </p>
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
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <MapPinned className="mx-auto text-slate-300" size={34} aria-hidden="true" />
            <h2 className="mt-4 font-bold text-slate-900">
              No hay estaciones disponibles
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
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
          />
        )}
      </div>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p>Precios del Ministerio para la Transición Ecológica de España.</p>
          <p>El precio final es orientativo y depende de tu descuento.</p>
        </div>
      </footer>
    </div>
  );
}
