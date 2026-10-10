"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPin, Search } from "lucide-react";
import { MAX_LOCATION_QUERY, MIN_LOCATION_QUERY } from "@/lib/geocoding";
import { isValidPosition } from "@/lib/geo";
import type { LocationCandidate, SearchLocation } from "@/lib/types";

export function LocationSearch({ onSelect, disabled }: {
  onSelect: (location: SearchLocation) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<LocationCandidate[]>([]);
  const [busy, setBusy] = useState<"search" | null>(null);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (disabled) request.current?.abort(); }, [disabled]);

  const search = async () => {
    if (query.trim().length < MIN_LOCATION_QUERY || disabled) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLocations([]);
    setMessage("");
    setBusy("search");
    try {
      const response = await fetch(`/api/locations?${new URLSearchParams({ q: query.trim() })}`, { signal: controller.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron buscar ubicaciones.");
      if (controller.signal.aborted) return;
      setLocations(payload.locations);
      setMessage(payload.locations.length ? "Elige una ubicación para buscar gasolineras." :
        "No encontramos esa ubicación. Prueba con el municipio o añade la provincia y el número de calle.");
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "No se pudo completar la búsqueda.");
    } finally {
      if (request.current === controller) setBusy(null);
    }
  };

  const select = (location: LocationCandidate) => {
    request.current?.abort();
    request.current = null;
    setBusy(null);
    if (!location.position || !isValidPosition(location.position)) {
      setMessage("No se pudo localizar ese resultado. Prueba con otra ubicación.");
      return;
    }
    const label = location.province && !location.label.includes(location.province)
      ? `${location.label}, ${location.province}` : location.label;
    onSelect({ ...location.position, label, precision: location.precision });
    setMessage("");
    setLocations([]);
  };

  return (
    <div className="relative mx-auto mt-6 max-w-xl border-t border-white/15 pt-5 text-left" data-clarity-mask="true">
      <form onSubmit={event => { event.preventDefault(); void search(); }}>
        <label htmlFor="location-query" className="mb-2 block text-sm font-semibold text-white">
          O busca por municipio, código postal o dirección
        </label>
        <div className="flex gap-2">
          <input id="location-query" type="search" autoComplete="off" value={query}
            minLength={MIN_LOCATION_QUERY} maxLength={MAX_LOCATION_QUERY} disabled={disabled}
            placeholder="Ej. Sevilla, 28013 o Calle Alcalá 1, Madrid"
            aria-describedby="location-help location-status"
            className="text-input min-w-0 flex-1 bg-[var(--surface-soft)]"
            onChange={event => {
              request.current?.abort();
              request.current = null;
              setQuery(event.target.value);
              setLocations([]);
              setMessage("");
              setBusy(null);
            }} />
          <button type="submit" disabled={disabled || !!busy || query.trim().length < MIN_LOCATION_QUERY}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--surface-soft)] px-3 text-sm font-bold text-[#143642] disabled:opacity-50">
            {busy === "search" ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            Buscar
          </button>
        </div>
        <p id="location-help" className="mt-2 text-xs leading-5 text-white/70">
          Busca en España sin activar la ubicación. Añade la provincia si hay varias coincidencias.
        </p>
      </form>
      <p id="location-status" role="status" className="mt-2 text-sm text-white/90">
        {busy === "search" ? "Buscando ubicaciones…" : message}
      </p>
      {locations.length > 0 && (
        <ul aria-label="Ubicaciones encontradas" className="mt-3 space-y-2">
          {locations.map(location => (
            <li key={`${location.type}:${location.id}`}>
              <button type="button" onClick={() => select(location)} disabled={disabled || !!busy}
                className="flex w-full items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-left text-[#17212B] transition-colors hover:bg-[#E5F1F5] disabled:opacity-60">
                <MapPin size={17} className="mt-0.5 shrink-0 text-[#2B7A9A]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-bold">{location.label}</span>
                  <span className="mt-1 block text-xs text-[#44505A]">
                    {[location.municipality, location.province].filter(Boolean).join(" · ")}
                    {(location.municipality || location.province) && " · "}
                    {location.precision === "address" ? "Dirección con número" : location.precision === "street"
                      ? "Calle · ubicación aproximada" : "Zona · ubicación aproximada"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-white/60">
        Ubicaciones: <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer" className="underline underline-offset-2">Photon</a>
        {" · "}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">© OpenStreetMap contributors</a>
      </p>
    </div>
  );
}
