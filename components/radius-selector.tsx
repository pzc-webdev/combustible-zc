"use client";

import { CircleDotDashed } from "lucide-react";
import {
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  RADIUS_PRESETS,
} from "@/lib/stations";

type RadiusSelectorProps = {
  value: number;
  onChange: (radiusKm: number) => void;
  disabled?: boolean;
};

export function RadiusSelector({
  value,
  onChange,
  disabled,
}: RadiusSelectorProps) {
  return (
    <section aria-labelledby="radius-title" className="panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-shell">
            <CircleDotDashed aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="eyebrow">Área de búsqueda</p>
            <h2 id="radius-title" className="section-title">
              Radio máximo
            </h2>
          </div>
        </div>
        <output
          htmlFor="radius-range"
          className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-700"
        >
          {value} km
        </output>
      </div>

      <input
        id="radius-range"
        type="range"
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        step="1"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-input mt-5"
        aria-label={`Radio máximo de búsqueda: ${value} kilómetros`}
      />

      <div className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Radios rápidos">
        {RADIUS_PRESETS.map((radius) => (
          <button
            key={radius}
            type="button"
            disabled={disabled}
            aria-pressed={value === radius}
            onClick={() => onChange(radius)}
            className="radius-preset"
          >
            {radius}
          </button>
        ))}
      </div>
    </section>
  );
}
