"use client";

import type { CSSProperties } from "react";
import { Route } from "lucide-react";
import { MAX_DETOUR_KM } from "@/lib/journey";

export function DetourSelector({ value, onChange, disabled }: {
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <section aria-labelledby="detour-title" className="step-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-shell"><Route size={20} aria-hidden="true" /></span>
          <div><p className="eyebrow">Paso 2</p><h2 id="detour-title" className="section-title">Desvío máximo</h2></div>
        </div>
        <output htmlFor="detour-range" className="shrink-0 text-2xl font-bold text-[#2B7A9A]">+{value} km</output>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#44505A]">Kilómetros extra que aceptas añadir al viaje para repostar, incluyendo salir del trayecto y volver a él.</p>
      <input id="detour-range" type="range" min="0" max={MAX_DETOUR_KM} step="1" value={value} disabled={disabled}
        aria-label="Desvío máximo en kilómetros" className="range-input mt-4"
        style={{ "--range-progress": `${value / MAX_DETOUR_KM * 100}%` } as CSSProperties}
        onChange={event => onChange(Number(event.target.value))} />
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {[0, 2, 5, 10, 20].map(amount => <button key={amount} type="button" className="radius-preset" disabled={disabled}
          aria-pressed={value === amount} onClick={() => onChange(amount)}>+{amount}</button>)}
      </div>
    </section>
  );
}
