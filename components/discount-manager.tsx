"use client";

import { useState } from "react";
import { ChevronDown, Plus, Tags, Trash2 } from "lucide-react";
import type { Discount } from "@/lib/types";

type DiscountManagerProps = {
  discounts: Discount[];
  onChange: (discounts: Discount[]) => void;
  disabled?: boolean;
};

export function DiscountManager({
  discounts,
  onChange,
  disabled,
}: DiscountManagerProps) {
  const [newBrand, setNewBrand] = useState("");
  const [newCents, setNewCents] = useState("");
  const [lastAddedBrand, setLastAddedBrand] = useState("");

  const numericCents = Number(newCents);
  const canAddDiscount =
    newBrand.trim().length > 0 &&
    Number.isFinite(numericCents) &&
    numericCents > 0 &&
    numericCents <= 100;

  const addDiscount = () => {
    if (!canAddDiscount) return;

    const brand = newBrand.trim();
    onChange([
      ...discounts,
      { id: crypto.randomUUID(), brand, cents: newCents },
    ]);
    setLastAddedBrand(brand);
    setNewBrand("");
    setNewCents("");
  };

  const updateDiscount = (
    id: string,
    field: "brand" | "cents",
    value: string,
  ) => {
    onChange(
      discounts.map((discount) =>
        discount.id === id ? { ...discount, [field]: value } : discount,
      ),
    );
  };

  const removeDiscount = (id: string) => {
    onChange(discounts.filter((discount) => discount.id !== id));
  };

  return (
    <details className="discount-panel group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <span className="flex min-w-0 items-center gap-3">
          <span className="icon-shell">
            <Tags aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0">
            <span className="eyebrow block">Opcional</span>
            <span className="section-title block">Mis descuentos</span>
            {discounts.length === 0 && (
              <span className="discount-empty-hint">
                Tus descuentos pueden cambiar el orden.
              </span>
            )}
          </span>
        </span>
        <span className="flex items-center gap-3">
          {discounts.some((discount) => discount.brand && discount.cents) && (
            <span className="hidden rounded-full bg-[var(--saving-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--saving)] sm:inline">
              {discounts.filter((discount) => discount.brand && discount.cents).length}{" "}
              activos
            </span>
          )}
          <ChevronDown
            className="text-[#57626C] transition-transform group-open:rotate-180"
            size={20}
            aria-hidden="true"
          />
        </span>
      </summary>

      <div className="border-t border-[#D8D2C8] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <p className="mb-4 text-sm leading-6 text-[#44505A]">
          Añade el descuento de tus tarjetas o programas de fidelización.
        </p>

        <div className="space-y-3">
          {discounts.map((discount) => (
            <div
              key={discount.id}
              className="grid grid-cols-[minmax(0,1fr)_96px_40px] items-end gap-2"
            >
              <label className="min-w-0">
                <span className="input-label">Marca</span>
                <input
                  type="text"
                  value={discount.brand}
                  disabled={disabled}
                  maxLength={40}
                  placeholder="Ej. Repsol"
                  autoComplete="organization"
                  onChange={(event) =>
                    updateDiscount(discount.id, "brand", event.target.value)
                  }
                  className="text-input"
                />
              </label>
              <label>
                <span className="input-label">Cént./L</span>
                <input
                  type="number"
                  value={discount.cents}
                  disabled={disabled}
                  min="0"
                  max="100"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="8"
                  onChange={(event) =>
                    updateDiscount(discount.id, "cents", event.target.value)
                  }
                  className="text-input"
                />
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeDiscount(discount.id)}
                aria-label={`Eliminar descuento de ${discount.brand || "esta fila"}`}
                className="delete-button"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        <form
          className={`${discounts.length > 0 ? "mt-4 border-t border-[#D8D2C8] pt-4" : ""}`}
          onSubmit={(event) => {
            event.preventDefault();
            addDiscount();
          }}
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#57626C]">
            Nuevo descuento
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] items-end gap-2">
            <label className="min-w-0">
              <span className="input-label">Marca</span>
              <input
                type="text"
                value={newBrand}
                disabled={disabled}
                maxLength={40}
                placeholder="Ej. Repsol"
                autoComplete="organization"
                onChange={(event) => {
                  setNewBrand(event.target.value);
                  setLastAddedBrand("");
                }}
                className="text-input"
              />
            </label>
            <label>
              <span className="input-label">Cént./L</span>
              <input
                type="number"
                value={newCents}
                disabled={disabled}
                min="0.1"
                max="100"
                step="0.1"
                inputMode="decimal"
                placeholder="8"
                onChange={(event) => {
                  setNewCents(event.target.value);
                  setLastAddedBrand("");
                }}
                className="text-input"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="min-h-5 text-xs font-medium text-[#44505A]">
              {lastAddedBrand
                ? `${lastAddedBrand} añadido y aplicado.`
                : "Completa ambos campos para añadirlo al cálculo."}
            </p>
            <button
              type="submit"
              disabled={disabled || !canAddDiscount}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--saving-accent)]/25 bg-[var(--saving-bg)] px-3 py-2 text-sm font-semibold text-[var(--saving)] transition-all duration-300 hover:border-[var(--saving-accent)]/50 hover:bg-[var(--saving-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus size={17} aria-hidden="true" />
              Añadir descuento
            </button>
          </div>
        </form>
      </div>
    </details>
  );
}
