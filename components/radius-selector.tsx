"use client";

import type { CSSProperties } from "react";
import { CircleDotDashed } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";
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
  const sliderProgress =
    ((value - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 100;

  return (
    <section aria-labelledby="radius-title" className="step-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="icon-shell">
            <CircleDotDashed aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="eyebrow">Paso 2</p>
            <div className="flex items-center gap-2">
              <h2 id="radius-title" className="section-title">
                Radio máximo
              </h2>
              <InfoTooltip
                id="radius-tooltip"
                label="Información sobre el radio de búsqueda"
              >
                Define la distancia máxima desde tu ubicación. Solo se
                mostrarán estaciones dentro de ese radio.
              </InfoTooltip>
            </div>
          </div>
        </div>
        <output
          htmlFor="radius-range"
          className="shrink-0 font-[var(--font-ibm-plex-mono)] text-2xl font-bold tracking-[-0.05em] text-[#2B7A9A]"
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
        style={{ "--range-progress": `${sliderProgress}%` } as CSSProperties}
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
