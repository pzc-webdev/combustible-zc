"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { LocationSearch } from "@/components/location-search";
import { JourneySearch } from "@/components/journey-search";
import { DetourSelector } from "@/components/detour-selector";
import { DEFAULT_DETOUR_KM, type JourneyResult } from "@/lib/journey";
import { rankStations } from "@/lib/ranking";
import { formatDistance } from "@/lib/format";
import {
  DEFAULT_PRICE_WEIGHT,
  DEFAULT_RADIUS_KM,
  processStations,
} from "@/lib/stations";
import type {
  Discount,
  FuelSelection,
  RawStation,
  ResultLists,
  SearchLocation,
  UserPosition,
} from "@/lib/types";

import { loadPreferences, savePreferences } from "@/lib/preferences";

type SearchStatus = "idle" | "locating" | "loading" | "success" | "error";

const EMPTY_RESULTS: ResultLists = {
  cheapest: [],
  nearest: [],
  smartest: [],
};

function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "No tenemos permiso para acceder a tu ubicación. Puedes buscar por municipio, código postal o dirección en el formulario de arriba.";
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
  const [mode, setMode] = useState<"nearby" | "journey">("nearby");
  const [maximumDetourKm, setMaximumDetourKm] = useState(DEFAULT_DETOUR_KM);
  const [journeyResult, setJourneyResult] = useState<(JourneyResult & {
    origin: SearchLocation; destination: SearchLocation; maximumDetourKm: number;
  }) | null>(null);
  const [rawStations, setRawStations] = useState<RawStation[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [searchLocation, setSearchLocation] = useState<SearchLocation | null>(null);
  const stationRequest = useRef<AbortController | null>(null);
  const resultsSection = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState("");
  const [sourceUpdatedAt, setSourceUpdatedAt] = useState<string | null>(null);
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => () => stationRequest.current?.abort(), []);

  useEffect(() => {
    if (status !== "success") return;
    resultsSection.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
    });
  }, [status]);

  useEffect(() => {
    const storageTimer = window.setTimeout(() => {
      const saved = loadPreferences(() => window.localStorage);
      setDiscounts(saved.discounts);
      setRadiusKm(saved.radiusKm);
      setSelection(saved.selection);
      setPriceWeight(saved.priceWeight);
      setMaximumDetourKm(saved.maximumDetourKm);
      setHasLoadedStorage(true);
    }, 0);

    return () => window.clearTimeout(storageTimer);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    savePreferences(() => window.localStorage, {
      version: 1, discounts, radiusKm, selection, priceWeight, maximumDetourKm,
    });
  }, [discounts, hasLoadedStorage, radiusKm, selection, priceWeight, maximumDetourKm]);

  const results = useMemo(() => {
    if (mode === "journey") return journeyResult ? rankStations(journeyResult.stations, priceWeight) : EMPTY_RESULTS;
    if (!userPosition || rawStations.length === 0) return EMPTY_RESULTS;
    return processStations(
      rawStations,
      selection,
      discounts,
      userPosition,
      radiusKm,
      priceWeight,
    );
  }, [discounts, priceWeight, radiusKm, rawStations, selection, userPosition, mode, journeyResult]);

  const clearJourney = () => {
    stationRequest.current?.abort();
    stationRequest.current = null;
    setStatus("idle");
    setError("");
    setJourneyResult(null);
  };

  const searchJourney = async (origin: SearchLocation, destination: SearchLocation) => {
    stationRequest.current?.abort();
    const controller = new AbortController();
    stationRequest.current = controller;
    setStatus("loading");
    setError("");
    setJourneyResult(null);
    try {
      const response = await fetch("/api/journey", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: { latitude: origin.latitude, longitude: origin.longitude },
          destination: { latitude: destination.latitude, longitude: destination.longitude },
          maximumDetourKm, selection, discounts }), signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo buscar en el trayecto.");
      if (controller.signal.aborted) return;
      setJourneyResult({ ...payload, origin, destination, maximumDetourKm });
      setSourceUpdatedAt(payload.sourceUpdatedAt);
      setStatus("success");
    } catch (searchError) {
      if (controller.signal.aborted) return;
      setError(searchError instanceof Error ? searchError.message : "No se pudo buscar en el trayecto.");
      setStatus("error");
    }
  };

  const search = async (manualLocation?: SearchLocation) => {
    stationRequest.current?.abort();
    const controller = new AbortController();
    stationRequest.current = controller;
    setError("");
    setStatus(manualLocation ? "loading" : "locating");

    try {
      const position = manualLocation ?? await locateUser();
      if (controller.signal.aborted) return;
      setStatus("loading");

      const searchParams = new URLSearchParams({
        lat: position.latitude.toFixed(5),
        lng: position.longitude.toFixed(5),
      });
      const response = await fetch("/api/stations?" + searchParams.toString(), {
        signal: controller.signal,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "No se pudieron cargar los precios.");
      }

      if (controller.signal.aborted) return;
      setUserPosition(position);
      setSearchLocation(manualLocation ?? { ...position, label: "Tu ubicación actual", precision: "device" });
      setRawStations(payload.stations);
      setSourceUpdatedAt(payload.sourceUpdatedAt);
      setStatus("success");
    } catch (searchError) {
      if (controller.signal.aborted) return;
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
    <div className="flex min-h-dvh flex-col bg-[var(--background)] text-[#17212B]">
      <main className="relative flex-1 overflow-hidden">
        <div className="hero-glow" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:px-10">
        <section className="relative mx-auto max-w-5xl px-2 py-8 text-center sm:px-10 sm:py-10">
          <h1 className="text-balance text-[2.35rem] font-extrabold leading-[1.02] tracking-[-0.065em] text-[#17212B] sm:text-6xl">
            No hagas kilómetros de más. Paga {" "}
            <span className="text-[var(--action)]">de menos.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-[#44505A] sm:text-lg">
            La gasolinera más cercana no siempre es la mejor opción. Mejora tu ahorro con solo unos cuantos clics.
          </p>
        </section>

        <div className="mx-auto mb-5 grid max-w-md grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-muted)] p-1.5"
          role="group" aria-label="Tipo de búsqueda">
          {([{ key: "nearby", label: "Cerca de mí" }, { key: "journey", label: "En ruta" }] as const).map(option => (
            <button key={option.key} type="button" aria-pressed={mode === option.key}
              className={`cursor-pointer rounded-lg px-4 py-3 text-sm font-bold ${mode === option.key ? "bg-[#143642] text-white" : "text-[#44505A]"}`}
              onClick={() => { if (mode !== option.key) { clearJourney(); setMode(option.key); } }}>{option.label}</button>
          ))}
        </div>

        <section
          className="configurator mx-auto mt-4 grid max-w-6xl lg:mt-5 lg:grid-cols-12"
          aria-label="Preferencias de búsqueda"
        >
          <div className="config-step config-step-fuel lg:col-span-5">
            <FuelSelector
              value={selection}
              onChange={value => { setSelection(value); if (mode === "journey") clearJourney(); }}
              disabled={isSearching}
            />
          </div>
          <div className="config-step config-step-radius lg:col-span-7">
            {mode === "journey" ? <DetourSelector value={maximumDetourKm}
              onChange={value => { setMaximumDetourKm(value); clearJourney(); }} disabled={isSearching} /> : <RadiusSelector
              value={radiusKm}
              onChange={setRadiusKm}
              disabled={isSearching}
            />}
          </div>
          <div className="config-step config-step-score lg:col-span-12">
            <ScoreWeightSelector
              inJourney={mode === "journey"}
              priceWeight={priceWeight}
              onChange={setPriceWeight}
              disabled={isSearching}
            />
          </div>
          <div className="config-step config-step-discounts lg:col-span-12">
            <DiscountManager
              discounts={discounts}
              onChange={value => { setDiscounts(value); if (mode === "journey") clearJourney(); }}
              disabled={isSearching}
            />
          </div>
          <section className="config-action relative overflow-hidden bg-[#143642] px-5 py-6 text-center sm:px-7 lg:col-span-12">
          <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-8 size-32 rounded-full border border-white/10" />
          {mode === "nearby" ? <>
          <p className="relative mb-3 font-[var(--font-ibm-plex-mono)] text-[11px] font-medium tracking-[0.08em] text-white/65">
            {selection.family === "gasoline" ? "GASOLINA" : "GASOIL"} · {selection.grade === "normal" ? "NORMAL" : "PREMIUM"} · {radiusKm} KM · PRECIO {priceWeight}%
          </p>
          <button
            type="button"
            onClick={() => void search()}
            disabled={isSearching}
            className="search-button"
          >
            {isSearching ? (
              <LoaderCircle className="animate-spin" size={21} aria-hidden="true" />
            ) : status === "success" && searchLocation?.precision === "device" ? (
              <RotateCw size={20} aria-hidden="true" />
            ) : (
              <LocateFixed size={21} aria-hidden="true" />
            )}
            {status === "locating"
              ? "Obteniendo ubicación…"
              : status === "loading"
                ? "Consultando precios…"
                : status === "success" && searchLocation?.precision === "device"
                  ? "Actualizar mi ubicación"
                  : "Buscar cerca de mí"}
          </button>
          <p className="relative mt-3 text-[11px] text-white/60">
            Distancias en línea recta. Tu ubicación de búsqueda no se guarda en tus preferencias.
          </p>
          <LocationSearch onSelect={location => void search(location)} disabled={isSearching} />
          </> : <JourneySearch disabled={isSearching} onSearch={(origin, destination) => void searchJourney(origin, destination)} onEdit={clearJourney} />}
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

        {status === "success" && (
          <div ref={resultsSection} className="scroll-mt-6">
            {mode === "journey" && journeyResult && (
              <div className="mx-auto mt-6 max-w-6xl space-y-2 text-sm leading-6 text-[#44505A]">
                <p data-clarity-mask="true"><strong>{journeyResult.origin.label} → {journeyResult.destination.label}</strong></p>
                <p>Trayecto sin parada: {formatDistance(journeyResult.baseRoute.distanceKm)} · {Math.ceil(journeyResult.baseRoute.durationMinutes)} min.
                  {" "}Desvío máximo: +{journeyResult.maximumDetourKm} km.</p>
                {(journeyResult.origin.precision !== "address" || journeyResult.destination.precision !== "address") &&
                  <p className="text-xs">Los lugares elegidos son aproximados. Busca una dirección con número para concretar el trayecto.</p>}
                <p className="text-xs">Evaluadas {journeyResult.evaluatedCount} de {journeyResult.candidateCount} estaciones próximas al trayecto.
                  {" "}La selección combina precio y distintas partes del viaje; puede haber otras opciones.</p>
              </div>
            )}
            {mode === "nearby" && searchLocation && (
              <p className="mx-auto mt-6 max-w-6xl text-sm text-[#44505A]" data-clarity-mask="true">
                Buscando cerca de <strong>{searchLocation.label}</strong>.
                {searchLocation.precision === "area" && " Ubicación aproximada de la zona; indica una calle y número para concretar."}
                {searchLocation.precision === "street" && " Ubicación aproximada de la calle; indica un número para concretar."}
              </p>
            )}

            {noResults && (
              <div className="mx-auto mt-8 max-w-xl rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-6 py-10 text-center shadow-[0_14px_30px_rgba(23,33,43,0.06)]">
                <MapPinned className="mx-auto text-[#2B7A9A]" size={34} aria-hidden="true" />
                <h2 className="mt-4 font-bold text-[#17212B]">
                  No hay estaciones disponibles
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#44505A]">
                  {mode === "journey" ? "Ninguna de las estaciones evaluadas cumple el desvío máximo. Amplía el límite o cambia el trayecto."
                    : `No encontramos estaciones con precio para este combustible a menos de ${radiusKm} km. Prueba otra variante o amplía el radio.`}
                </p>
          </div>
        )}

        {hasResults && (
          <ResultsBoard
            lists={results}
            sourceUpdatedAt={sourceUpdatedAt}
            radiusKm={radiusKm}
            priceWeight={priceWeight}
            journey={mode === "journey" && journeyResult ? { origin: journeyResult.origin, destination: journeyResult.destination } : undefined}
          />
        )}
            {mode === "journey" && journeyResult && <p className="mx-auto mt-5 max-w-6xl text-xs leading-5 text-[#44505A]">
              Desvíos estimados para conducir, sin contar el tiempo de repostaje. Comprueba los accesos de la estación.
              {" "}Rutas: <a className="underline" href="https://project-osrm.org/" target="_blank" rel="noreferrer">OSRM</a>
              {" · "}<a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
              {" · "}<a className="underline" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Corregir el mapa</a>
            </p>}
          </div>
        )}
      </div>
      </main>

      <footer className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_62%,transparent)]">
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
