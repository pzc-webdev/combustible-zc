"use client";

import { BadgeCheck, MapPin, Navigation } from "lucide-react";
import { formatDistance, priceFormatter } from "@/lib/format";
import type { StationResult } from "@/lib/types";

type StationCardProps = {
  station: StationResult;
  rank: number;
  showScore?: boolean;
  cheapestRank?: number;
  nearestRank?: number;
  rankingTotal?: number;
};

function rankingBadgeClass(rank: number, total: number): string {
  if (rank === 1) {
    return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300";
  }

  const percentile = rank / total;
  if (percentile <= 0.1) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200";
  }
  if (percentile <= 0.35) {
    return "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200";
  }
  return "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200";
}

export function StationCard({
  station,
  rank,
  showScore = false,
  cheapestRank,
  nearestRank,
  rankingTotal,
}: StationCardProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  const hasDiscount = station.discountCents > 0;

  return (
    <article className="station-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rank-badge">{rank}</span>
            {showScore && (
              <span className="score-badge">{station.score} pts</span>
            )}
          </div>
          <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-slate-900">
            {station.brand}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-[1.55rem] font-bold leading-none tracking-[-0.05em] text-emerald-700">
            {priceFormatter.format(station.finalPrice)}
            <span className="ml-1 font-sans text-xs font-semibold tracking-normal text-slate-500">
              €/L
            </span>
          </p>
          {hasDiscount && (
            <p className="mt-1 text-xs text-slate-400 line-through">
              {priceFormatter.format(station.originalPrice)} €/L
            </p>
          )}
        </div>
      </div>

      {hasDiscount && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
          <BadgeCheck size={13} aria-hidden="true" />
          Descuento aplicado · −{station.discountCents.toLocaleString("es-ES")} cts/L
        </div>
      )}

      {showScore &&
        cheapestRank !== undefined &&
        nearestRank !== undefined &&
        rankingTotal && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-bold " +
              rankingBadgeClass(cheapestRank, rankingTotal)
            }
          >
            {cheapestRank === 1
              ? "La más barata"
              : "Nº" + cheapestRank + " en precio"}
          </span>
          <span
            className={
              "rounded-full px-2.5 py-1 text-[11px] font-bold " +
              rankingBadgeClass(nearestRank, rankingTotal)
            }
          >
            {nearestRank === 1
              ? "La más cercana"
              : "Nº" + nearestRank + " en cercanía"}
          </span>
        </div>
      )}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="line-clamp-1 text-sm text-slate-600">{station.address}</p>
        {station.locality && (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
            {station.locality}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <MapPin size={14} className="text-emerald-600" aria-hidden="true" />
            {formatDistance(station.distanceKm)}
          </span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-emerald-700"
            aria-label={`Cómo llegar a ${station.brand}`}
          >
            Cómo llegar
            <Navigation size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}
