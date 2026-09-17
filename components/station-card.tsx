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
    return "bg-[var(--rank-gold-bg)] text-[var(--rank-gold)] ring-1 ring-inset ring-[var(--rank-gold-border)]";
  }

  const percentile = rank / total;
  if (percentile <= 0.1) {
    return "bg-[var(--rank-good-bg)] text-[var(--rank-good)] ring-1 ring-inset ring-[var(--rank-good-border)]";
  }
  if (percentile <= 0.35) {
    return "bg-[var(--rank-warning-bg)] text-[var(--rank-warning)] ring-1 ring-inset ring-[var(--rank-warning-border)]";
  }
  return "bg-[var(--rank-bad-bg)] text-[var(--rank-bad)] ring-1 ring-inset ring-[var(--rank-bad-border)]";
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
    <article
      className={
        showScore && rank === 1
          ? "station-card station-card-winner"
          : "station-card"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rank-badge">{rank}</span>
            {showScore && (
              <span className="score-badge">{station.score} pts</span>
            )}
            {showScore && rank === 1 && (
              <span className="winner-label">Mejor relación</span>
            )}
          </div>
          <h3 className="truncate text-[15px] font-bold tracking-[-0.01em] text-[#17212B]">
            {station.brand}
          </h3>
        </div>

        <div className="shrink-0 rounded-lg border border-[var(--saving-border)] bg-[var(--saving-bg)] px-2.5 py-2 text-right">
          <p className="font-[var(--font-ibm-plex-mono)] text-[1.9rem] font-bold leading-none tracking-[-0.04em] text-[var(--saving)]">
            {priceFormatter.format(station.finalPrice)}
            <span className="ml-1 font-[var(--font-inter)] text-xs font-bold tracking-normal text-[var(--saving)]">
              €/L
            </span>
          </p>
          {hasDiscount && (
            <p className="mt-1 text-xs text-[var(--saving)]/70 line-through">
              {priceFormatter.format(station.originalPrice)} €/L
            </p>
          )}
        </div>
      </div>

      {hasDiscount && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--saving-border)] bg-[var(--saving-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--saving)]">
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

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <p className="line-clamp-1 text-sm text-[#44505A]">{station.address}</p>
        {station.locality && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[#44505A]">
            {station.locality}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#44505A]">
            <MapPin size={14} className="text-[#2B7A9A]" aria-hidden="true" />
            {formatDistance(station.distanceKm)}
          </span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#44505A] transition-all duration-300 hover:text-[#143642]"
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
