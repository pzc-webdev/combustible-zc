"use client";

import { useState } from "react";
import { LoaderCircle, Route } from "lucide-react";
import { LocationSearch } from "./location-search";
import type { SearchLocation } from "@/lib/types";

export function JourneySearch({ disabled, onSearch, onEdit }: {
  disabled: boolean;
  onSearch: (origin: SearchLocation, destination: SearchLocation) => void;
  onEdit: () => void;
}) {
  const [origin, setOrigin] = useState<SearchLocation | null>(null);
  const [destination, setDestination] = useState<SearchLocation | null>(null);
  return (
    <div className="relative">
      <p className="text-sm leading-6 text-white/80">Elige dónde empieza y termina tu viaje. Buscaremos gasolineras en el trayecto.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationSearch id="journey-origin" label="Origen" buttonLabel="Buscar origen" disabled={disabled}
          onSelect={location => { setOrigin(location); onEdit(); }} onEdit={() => { setOrigin(null); onEdit(); }} />
        <LocationSearch id="journey-destination" label="Destino" buttonLabel="Buscar destino" disabled={disabled}
          onSelect={location => { setDestination(location); onEdit(); }} onEdit={() => { setDestination(null); onEdit(); }} />
      </div>
      {origin && destination && <p className="mt-4 text-sm text-white/90" data-clarity-mask="true">{origin.label} → {destination.label}</p>}
      <button type="button" disabled={disabled || !origin || !destination} className="search-button mt-5"
        onClick={() => { if (origin && destination) onSearch(origin, destination); }}>
        {disabled ? <LoaderCircle size={20} className="animate-spin" aria-hidden="true" /> : <Route size={20} aria-hidden="true" />}
        {disabled ? "Buscando estaciones en ruta…" : "Buscar estaciones en ruta"}
      </button>
      <p className="mt-3 text-xs text-white/65">Selecciona un resultado para cada lugar antes de buscar.</p>
    </div>
  );
}
