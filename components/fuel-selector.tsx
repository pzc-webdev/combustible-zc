"use client";

import { Fuel } from "lucide-react";
import type { FuelFamily, FuelGrade, FuelSelection } from "@/lib/types";

type FuelSelectorProps = {
  value: FuelSelection;
  onChange: (selection: FuelSelection) => void;
  disabled?: boolean;
};

const FAMILIES: { value: FuelFamily; label: string }[] = [
  { value: "gasoline", label: "Gasolina" },
  { value: "diesel", label: "Gasoil" },
];

const GRADES: { value: FuelGrade; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "premium", label: "Premium" },
];

export function FuelSelector({
  value,
  onChange,
  disabled,
}: FuelSelectorProps) {
  return (
    <section aria-labelledby="fuel-title" className="step-panel p-5 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="icon-shell">
          <Fuel aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="eyebrow">Paso 1</p>
          <h2 id="fuel-title" className="section-title">
            Elige tu combustible
          </h2>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <fieldset>
          <legend className="field-label">Tipo</legend>
          <div className="segmented-control">
            {FAMILIES.map((family) => (
              <button
                key={family.value}
                type="button"
                disabled={disabled}
                aria-pressed={value.family === family.value}
                onClick={() => onChange({ ...value, family: family.value })}
                className="segment-button"
              >
                {family.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="field-label flex items-center gap-1.5">
            Variante
          </legend>
          <div className="segmented-control">
            {GRADES.map((grade) => (
              <button
                key={grade.value}
                type="button"
                disabled={disabled}
                aria-pressed={value.grade === grade.value}
                onClick={() => onChange({ ...value, grade: grade.value })}
                className="segment-button"
              >
                {grade.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
