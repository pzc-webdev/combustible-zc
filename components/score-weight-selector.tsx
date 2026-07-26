"use client";

import { SlidersHorizontal } from "lucide-react";

type ScoreWeightSelectorProps = {
  priceWeight: number;
  onChange: (priceWeight: number) => void;
  disabled?: boolean;
};

const PRESETS = [
  { label: "Equilibrado", value: 50 },
  { label: "Precio", value: 70 },
  { label: "Muy barato", value: 85 },
] as const;

export function ScoreWeightSelector({
  priceWeight,
  onChange,
  disabled,
}: ScoreWeightSelectorProps) {
  const distanceWeight = 100 - priceWeight;

  return (
    <section aria-labelledby="score-weight-title" className="panel p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="icon-shell">
          <SlidersHorizontal aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="eyebrow">Mejor opción</p>
          <h2 id="score-weight-title" className="section-title">
            Prioridad del cálculo
          </h2>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Precio
          </p>
          <p className="mono-price mt-0.5 text-lg font-bold tabular-nums text-emerald-800">
            {priceWeight}%
          </p>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            Distancia
          </p>
          <p className="mono-price mt-0.5 text-lg font-bold tabular-nums text-slate-700">
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
        className="range-input mt-5"
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
            className="radius-preset px-1 text-[10px]"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
