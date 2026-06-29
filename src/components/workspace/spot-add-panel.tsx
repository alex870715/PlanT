"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  inferTripDestination,
  suggestSpotsForDay,
} from "@/lib/discover/spot-suggestions";
import { DESTINATIONS } from "@/lib/discover/catalog";
import type { PlaceResult } from "@/lib/places/nominatim";
import type { SpotDto } from "@/types/trip";

export type AddSpotPayload = {
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

type SpotAddPanelProps = {
  tripTitle: string;
  tripSpots: SpotDto[];
  daySpots: SpotDto[];
  addName: string;
  adding: boolean;
  onAddNameChange: (value: string) => void;
  onSelectPayload: (payload: AddSpotPayload) => void;
  onSubmitCustom: () => void;
};

function anchorForDay(
  tripTitle: string,
  tripSpots: SpotDto[],
  daySpots: SpotDto[]
): { lat: number; lng: number } {
  if (daySpots.length > 0) {
    return { lat: daySpots[0].latitude, lng: daySpots[0].longitude };
  }
  const slug = inferTripDestination(tripTitle, tripSpots);
  const dest = DESTINATIONS.find((d) => d.slug === slug);
  return dest?.center ?? { lat: 33.59, lng: 130.4 };
}

export function SpotAddPanel({
  tripTitle,
  tripSpots,
  daySpots,
  addName,
  adding,
  onAddNameChange,
  onSelectPayload,
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

  const anchor = useMemo(
    () => anchorForDay(tripTitle, tripSpots, daySpots),
    [tripTitle, tripSpots, daySpots]
  );

  const [liveResults, setLiveResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const query = addName.trim();
  const hasQuery = query.length > 0;

  useEffect(() => {
    if (query.length < 2) {
      setLiveResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const handle = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({
          q: query,
          lat: String(anchor.lat),
          lng: String(anchor.lng),
        });
        const res = await fetch(`/api/places/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: PlaceResult[] };
        setLiveResults(data.results ?? []);
      } catch {
        if (!controller.signal.aborted) setLiveResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query, anchor.lat, anchor.lng]);

  const dayNames = useMemo(
    () =>
      new Set(
        daySpots.map((s) => s.name.trim().toLowerCase().replace(/\s+/g, ""))
      ),
    [daySpots]
  );

  const curatedTitle = hasQuery
    ? "精選資料庫"
    : daySpots.length > 0
      ? "此日第一站附近推薦"
      : "熱門推薦景點";

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-emerald-300 bg-emerald-50/70 p-2 shadow-sm">
      {destination && (
        <p className="flex items-center gap-1 text-[10px] font-medium text-emerald-800">
          <Sparkles className="h-3 w-3" />
          {destination.emoji} {destination.label} · 精選 + 全球地點搜尋
        </p>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-600" />
          <Input
            placeholder="搜尋地點名稱（如：金閣寺、明洞）…"
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

      {/* 即時全球地點搜尋（OSM） */}
      {hasQuery && (
        <div className="rounded-md border border-sky-200 bg-white/80 p-1.5">
          <p className="mb-1.5 flex items-center gap-1 px-0.5 text-[10px] font-semibold text-sky-900">
            <Globe className="h-3 w-3" />
            地圖搜尋結果
            {searching && <Loader2 className="h-3 w-3 animate-spin" />}
          </p>
          {liveResults.length > 0 ? (
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {liveResults.map((place) => {
                const dup = dayNames.has(
                  place.name.trim().toLowerCase().replace(/\s+/g, "")
                );
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      disabled={adding || dup}
                      onClick={() =>
                        onSelectPayload({
                          name: place.name,
                          latitude: place.latitude,
                          longitude: place.longitude,
                          notes: place.description || undefined,
                        })
                      }
                      className="flex w-full items-start gap-2 rounded-md border border-sky-100 bg-white px-2 py-1.5 text-left text-xs transition-colors hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-sky-950">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {place.category === "food" ? "🍽️ 餐飲" : "📍 景點"}
                          {place.area && <> · {place.area}</>}
                          {place.description && <> · {place.description}</>}
                          {dup && <> · 此日已有</>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
              {searching ? "搜尋中…" : "查無地圖結果，可改用精選或自訂加入"}
            </p>
          )}
        </div>
      )}

      {/* 精選資料庫推薦 */}
      <div className="rounded-md border border-emerald-200 bg-white/80 p-1.5">
        <p className="mb-1.5 px-0.5 text-[10px] font-semibold text-emerald-900">
          {curatedTitle}
        </p>

        {suggestions.length > 0 ? (
          <ul className="max-h-44 space-y-1 overflow-y-auto">
            {suggestions.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  disabled={adding || card.alreadyOnDay}
                  onClick={() =>
                    onSelectPayload({
                      name: card.name,
                      latitude: card.latitude,
                      longitude: card.longitude,
                      notes: card.description || undefined,
                    })
                  }
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
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
            {hasQuery
              ? "精選庫無相符，請改用上方地圖搜尋或自訂加入"
              : destination
                ? "此區精選景點都已排入，試試搜尋或自訂加入"
                : "無法辨識目的地，請用搜尋或自訂加入"}
          </p>
        )}
      </div>
    </div>
  );
}
