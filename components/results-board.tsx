"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Sparkles, TrendingDown } from "lucide-react";
import { StationCard } from "@/components/station-card";
import type { ResultLists, StationResult } from "@/lib/types";

type ListKey = keyof ResultLists;

type ResultsBoardProps = {
  lists: ResultLists;
  sourceUpdatedAt: string | null;
  radiusKm: number;
  priceWeight: number;
};

const STATIONS_PER_PAGE = 20;

const LISTS: {
  key: ListKey;
  title: string;
  shortTitle: string;
  description: string;
  icon: typeof TrendingDown;
}[] = [
  {
    key: "cheapest",
    title: "Más baratas",
    shortTitle: "Baratas",
    description: "Menor precio final",
    icon: TrendingDown,
  },
  {
    key: "nearest",
    title: "Más cercanas",
    shortTitle: "Cercanas",
    description: "Menor distancia",
    icon: MapPin,
  },
  {
    key: "smartest",
    title: "Mejor opción",
    shortTitle: "Mejor",
    description: "Smart Score",
    icon: Sparkles,
  },
];

function ResultColumn({
  listKey,
  title,
  description,
  icon: Icon,
  stations,
  cheapestRanks,
  nearestRanks,
}: {
  listKey: ListKey;
  title: string;
  description: string;
  icon: typeof TrendingDown;
  stations: StationResult[];
  cheapestRanks?: Map<string, number>;
  nearestRanks?: Map<string, number>;
}) {
  const [visibleCount, setVisibleCount] = useState(STATIONS_PER_PAGE);
  const visibleStations = stations.slice(0, visibleCount);
  const remainingStations = stations.length - visibleStations.length;

  return (
    <section aria-labelledby={`${listKey}-title`} className="result-column">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#D8D2C8] bg-[#FFFCF5]/94 px-4 py-4 backdrop-blur sm:px-5">
        <span
          className={`result-icon ${listKey === "smartest" ? "result-icon-smart" : ""}`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <div>
          <h2
            id={`${listKey}-title`}
            className="text-sm font-bold text-[#17212B]"
          >
            {title}
          </h2>
          <p className="text-[11px] text-[#44505A]">{description}</p>
        </div>
      </header>
      <div className="space-y-3 p-3 sm:p-4">
        {visibleStations.map((station, index) => (
          <StationCard
            key={station.id}
            station={station}
            rank={index + 1}
            showScore={listKey === "smartest"}
            cheapestRank={cheapestRanks?.get(station.id)}
            nearestRank={nearestRanks?.get(station.id)}
            rankingTotal={cheapestRanks?.size}
          />
        ))}
        {remainingStations > 0 && (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((current) => current + STATIONS_PER_PAGE)
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#D8D2C8] bg-[#FFFCF5] px-4 py-3 text-sm font-bold text-[#143642] transition-all duration-300 hover:border-[#2B7A9A] hover:bg-[#E5F1F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--action)] focus-visible:ring-offset-2"
          >
            Mostrar 20 más
            <ChevronDown size={17} aria-hidden="true" />
            <span className="text-xs font-medium text-[#44505A]">
              ({remainingStations} restantes)
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

export function ResultsBoard({
  lists,
  sourceUpdatedAt,
  radiusKm,
  priceWeight,
}: ResultsBoardProps) {
  const [activeList, setActiveList] = useState<ListKey>("smartest");
  const stationCount = lists.cheapest.length;
  const cheapestRanks = new Map(
    lists.cheapest.map((station, index) => [station.id, index + 1]),
  );
  const nearestRanks = new Map(
    lists.nearest.map((station, index) => [station.id, index + 1]),
  );

  return (
    <section className="mt-10 sm:mt-14" aria-labelledby="results-title">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">
            Resultados en un radio de {radiusKm} km
          </p>
          <h2
            id="results-title"
            className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[#17212B] sm:text-3xl"
          >
            {stationCount} {stationCount === 1 ? "estación encontrada" : "estaciones encontradas"}
          </h2>
        </div>
        {sourceUpdatedAt && (
          <p className="text-xs text-[#44505A]">
            Precios oficiales: {sourceUpdatedAt}
          </p>
        )}
      </div>

      <div
        className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-[#D8D2C8] bg-[#EDEAE3] p-1 lg:hidden"
        role="tablist"
        aria-label="Orden de resultados"
      >
        {LISTS.map((list) => {
          const Icon = list.icon;
          const selected = activeList === list.key;
          return (
            <button
              key={list.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveList(list.key)}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2.5 text-xs font-bold transition-all duration-300 ${
                selected
                  ? "bg-[#143642] text-white shadow-[0_4px_10px_rgba(20,54,66,0.18)] hover:bg-[#1D4857] hover:shadow-[0_6px_14px_rgba(20,54,66,0.26)]"
                  : "text-[#57626C] hover:bg-[#FFFCF5]/85 hover:text-[#143642]"
              }`}
            >
              <Icon size={15} aria-hidden="true" />
              {list.shortTitle}
            </button>
          );
        })}
      </div>

      <div className="lg:hidden">
        {LISTS.filter((list) => list.key === activeList).map((list) => (
          <ResultColumn
            key={list.key + "-" + (lists[list.key][0]?.id ?? "empty") + "-" + lists[list.key].length}
            listKey={list.key}
            title={list.title}
            description={
              list.key === "smartest"
                ? priceWeight + "% precio · " + (100 - priceWeight) + "% distancia"
                : list.description
            }
            icon={list.icon}
            stations={lists[list.key]}
            cheapestRanks={list.key === "smartest" ? cheapestRanks : undefined}
            nearestRanks={list.key === "smartest" ? nearestRanks : undefined}
          />
        ))}
      </div>

      <div className="hidden grid-cols-3 gap-4 lg:grid xl:gap-5">
        {LISTS.map((list) => (
          <ResultColumn
            key={list.key + "-" + (lists[list.key][0]?.id ?? "empty") + "-" + lists[list.key].length}
            listKey={list.key}
            title={list.title}
            description={
              list.key === "smartest"
                ? priceWeight + "% precio · " + (100 - priceWeight) + "% distancia"
                : list.description
            }
            icon={list.icon}
            stations={lists[list.key]}
            cheapestRanks={list.key === "smartest" ? cheapestRanks : undefined}
            nearestRanks={list.key === "smartest" ? nearestRanks : undefined}
          />
        ))}
      </div>
    </section>
  );
}
