"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

type InfoTooltipProps = {
  id: string;
  label: string;
  children: string;
};

export function InfoTooltip({ id, label, children }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    if (!container.current || !tooltip.current || window.innerWidth >= 640) return;

    const anchor = container.current.getBoundingClientRect();
    const { width, height } = tooltip.current.getBoundingClientRect();
    const centeredLeft = anchor.left + anchor.width / 2 - width / 2;
    const left = Math.max(16, Math.min(centeredLeft, document.documentElement.clientWidth - width - 16));
    const above = anchor.bottom + 12 + height > window.innerHeight - 16 && anchor.top >= height + 28;

    tooltip.current.style.setProperty("--tooltip-shift", `${left - centeredLeft}px`);
    tooltip.current.style.setProperty("--tooltip-top", `${above ? -height - 12 : anchor.height + 12}px`);
    tooltip.current.dataset.placement = above ? "top" : "bottom";
  };

  const open = () => {
    updatePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setIsOpen(false);
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, [isOpen]);

  return (
    <span ref={container} className="relative inline-flex shrink-0"
      onPointerEnter={event => { if (event.pointerType === "mouse") open(); }}
      onPointerLeave={event => {
        if (event.pointerType === "mouse" && !container.current?.querySelector(":focus-visible")) setIsOpen(false);
      }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={isOpen}
        aria-controls={id}
        onFocus={event => { if (event.currentTarget.matches(":focus-visible")) open(); }}
        onClick={() => { if (isOpen) setIsOpen(false); else open(); }}
        className="inline-flex size-5 cursor-pointer items-center justify-center rounded-full border border-[#A8B5BA] bg-transparent text-[#44505A] transition-all duration-200 hover:border-[#2B7A9A] hover:bg-[#E5F1F5] hover:text-[#195E79] focus-visible:border-[#2B7A9A] focus-visible:bg-[#E5F1F5] focus-visible:text-[#195E79]"
      >
        <Info aria-hidden="true" size={12} strokeWidth={2.25} />
      </button>
      <span
        ref={tooltip}
        id={id}
        role="tooltip"
        aria-hidden={!isOpen}
        data-open={isOpen}
        className="pointer-events-none invisible absolute left-[calc(50%+var(--tooltip-shift,0px))] top-[var(--tooltip-top,calc(100%+0.75rem))] z-40 w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-[#143642] px-4 py-3 text-left text-sm font-medium leading-6 text-white opacity-0 shadow-[0_10px_28px_rgba(20,54,66,0.24)] transition-[opacity,visibility] duration-200 before:absolute before:left-[calc(50%-var(--tooltip-shift,0px))] before:-top-2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-[#143642] data-[open=true]:visible data-[open=true]:opacity-100 data-[placement=top]:before:top-full data-[placement=top]:before:border-b-transparent data-[placement=top]:before:border-t-[#143642] sm:left-[calc(100%+0.65rem)] sm:top-1/2 sm:w-64 sm:translate-x-0 sm:-translate-y-1/2 sm:px-3 sm:py-2.5 sm:text-xs sm:leading-5 sm:before:left-auto sm:before:right-full sm:before:top-1/2 sm:before:translate-x-0 sm:before:-translate-y-1/2 sm:before:border-b-transparent sm:before:border-r-[#143642] sm:data-[placement=top]:before:top-1/2 sm:data-[placement=top]:before:border-t-transparent"
      >
        {children}
      </span>
    </span>
  );
}
