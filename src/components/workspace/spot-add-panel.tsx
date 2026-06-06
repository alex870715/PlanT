"use client";

import { useMemo } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestSpotsForDay } from "@/lib/discover/spot-suggestions";
import type { DiscoverCard } from "@/types/discover";
import type { SpotDto } from "@/types/trip";

type SpotAddPanelProps = {
  tripTitle: string;
  tripSpots: SpotDto[];
  daySpots: SpotDto[];
  addName: string;
  adding: boolean;
  onAddNameChange: (value: string) => void;
  onSelectSuggestion: (card: DiscoverCard) => void;
  onSubmitCustom: () => void;
};

export function SpotAddPanel({
  tripTitle,
  tripSpots,
  daySpots,
  addName,
  adding,
  onAddNameChange,
  onSelectSuggestion,
  onSubmitCustom,
}: SpotAddPanelProps) {
  const { destination, suggestions } = useMemo(
    () =>
      suggestSpotsForDay({
        tripTitle,
        tripSpots,
        daySpots,
        query: addName,
        limit: 8,
      }),
    [tripTitle, tripSpots, daySpots, addName]
  );

  const hasQuery = addName.trim().length > 0;
  const listTitle = hasQuery
    ? "搜尋結果（依熱度）"
    : daySpots.length > 0
      ? "此日第一站附近推薦"
      : "熱門推薦景點";

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2 shadow-sm">
      {destination && (
        <p className="text-[10px] font-medium text-emerald-800">
          {destination.emoji} {destination.label} 景點資料庫
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-600" />
          <Input
            placeholder="搜尋或輸入景點名稱…"
            value={addName}
            onChange={(e) => onAddNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmitCustom()}
            className="h-8 border-emerald-200 bg-white pl-8 text-sm"
            autoFocus
          />
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 px-3"
          disabled={adding || !addName.trim()}
          onClick={onSubmitCustom}
        >
          {adding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "自訂加入"
          )}
        </Button>
      </div>

      <div className="rounded-md border border-emerald-200 bg-white/80 p-1.5">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold text-emerald-900">
          {listTitle}
        </p>

        {suggestions.length > 0 ? (
          <ul className="max-h-52 space-y-1 overflow-y-auto">
            {suggestions.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  disabled={adding || card.alreadyOnDay}
                  onClick={() => onSelectSuggestion(card)}
                  className="flex w-full items-start gap-2 rounded-md border border-emerald-100 bg-white px-2 py-1.5 text-left text-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-emerald-950">
                      {card.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {card.popularityText}
                      {card.distanceKm != null && !hasQuery && (
                        <> · 約 {card.distanceKm.toFixed(1)} km</>
                      )}
                      {card.area && <> · {card.area}</>}
                      {card.alreadyOnDay && <> · 此日已有</>}
                      {!card.alreadyOnDay && card.alreadyInTrip && (
                        <> · 其他天已有</>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">
            {hasQuery
              ? "找不到相符推薦，可按「自訂加入」手動建立"
              : destination
                ? "此區域景點似乎都已排入行程，試試搜尋關鍵字或自訂加入"
                : "無法辨識目的地，請用自訂加入"}
          </p>
        )}
      </div>
    </div>
  );
}
