"use client";

import type { CSSProperties } from "react";
import { SlidersHorizontal } from "lucide-react";
import { InfoTooltip } from "@/components/info-tooltip";

type ScoreWeightSelectorProps = {
  priceWeight: number;
  onChange: (priceWeight: number) => void;
  disabled?: boolean;
};

const PRESETS = [
  { label: "Distancia", value: 30 },
  { label: "Equilibrado", value: 50 },
  { label: "Precio", value: 70 },
] as const;

export function ScoreWeightSelector({
  priceWeight,
  onChange,
  disabled,
}: ScoreWeightSelectorProps) {
  const distanceWeight = 100 - priceWeight;

  return (
    <section
      aria-labelledby="score-weight-title"
      className="step-panel p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="icon-shell">
          <SlidersHorizontal aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="eyebrow">Paso 3</p>
          <div className="flex items-center gap-2">
            <h2 id="score-weight-title" className="section-title">
              Prioridad del cálculo
            </h2>
            <InfoTooltip
              id="score-weight-tooltip"
              label="Información sobre la prioridad del cálculo"
            >
              Un porcentaje de precio más alto da más importancia al coste por
              litro; el porcentaje restante pondera la distancia.
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div className="priority-readout mt-5 grid grid-cols-2 gap-2">
        <div className="priority-price rounded-lg px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
            Precio
          </p>
          <p className="mt-0.5 font-[var(--font-ibm-plex-mono)] text-2xl font-bold tabular-nums tracking-[-0.05em]">
            {priceWeight}%
          </p>
        </div>
        <div className="priority-distance rounded-lg px-3 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
            Distancia
          </p>
          <p className="mt-0.5 font-[var(--font-ibm-plex-mono)] text-2xl font-bold tabular-nums tracking-[-0.05em]">
            {distanceWeight}%
          </p>
        </div>
      </div>

      <input
        id="score-price-weight"
        type="range"
        min="0"
        max="100"
        step="5"
        value={priceWeight}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-input priority-range mt-5"
        style={{ "--range-progress": `${priceWeight}%` } as CSSProperties}
        aria-label={
          "Peso del precio: " +
          priceWeight +
          " %. Peso de la distancia: " +
          distanceWeight +
          " %."
        }
      />

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            disabled={disabled}
            aria-pressed={priceWeight === preset.value}
            onClick={() => onChange(preset.value)}
            className="radius-preset priority-preset px-1 text-[10px]"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
