"use client";

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
  const addDiscount = () => {
    onChange([
      ...discounts,
      { id: crypto.randomUUID(), brand: "", cents: "" },
    ]);
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
                Tus tarjetas pueden cambiar el ranking.
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
          Añade el descuento de tus tarjetas o programas de fidelización. Si
          varias reglas coinciden, aplicaremos la mayor.
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

        {discounts.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#D8D2C8] bg-[var(--saving-bg)]/45 px-4 py-5 text-center text-sm text-[#44505A]">
            Todavía no has añadido ningún descuento.
          </p>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={addDiscount}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--saving-accent)]/25 bg-[var(--saving-bg)] px-3 py-2 text-sm font-semibold text-[var(--saving)] transition-all duration-300 hover:border-[var(--saving-accent)]/50 hover:bg-[var(--saving-hover)] disabled:opacity-50"
        >
          <Plus size={17} aria-hidden="true" />
          Añadir descuento
        </button>
      </div>
    </details>
  );
}
