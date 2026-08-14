import { Info } from "lucide-react";

type InfoTooltipProps = {
  id: string;
  label: string;
  children: string;
};

export function InfoTooltip({ id, label, children }: InfoTooltipProps) {
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="inline-flex size-5 items-center justify-center rounded-full border border-[#A8B5BA] bg-transparent text-[#44505A] transition-all duration-200 hover:border-[#2B7A9A] hover:bg-[#E5F1F5] hover:text-[#195E79] focus-visible:border-[#2B7A9A] focus-visible:bg-[#E5F1F5] focus-visible:text-[#195E79]"
      >
        <Info aria-hidden="true" size={12} strokeWidth={2.25} />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-[calc(100%+0.65rem)] left-1/2 z-40 w-[min(16rem,calc(100vw-3rem))] -translate-x-1/2 rounded-lg bg-[#143642] px-3 py-2.5 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-[0_10px_28px_rgba(20,54,66,0.24)] transition-all duration-200 before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-[#143642] group-hover:visible group-hover:translate-y-[-2px] group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-[-2px] group-focus-within:opacity-100"
      >
        {children}
      </span>
    </span>
  );
}
