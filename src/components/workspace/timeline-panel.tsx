"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortableDayTimeline } from "@/components/workspace/sortable-day-timeline";
import { SpotEditDialog } from "@/components/workspace/spot-edit-dialog";
import { defaultScheduledAtForDay } from "@/lib/spot-groups";
import {
  flattenGroups,
  groupSpotsByDay,
} from "@/lib/spot-groups";
import { partitionSpots } from "@/lib/spots";
import { tripHasLodging } from "@/lib/spot-category";
import { inferTripDestination } from "@/lib/discover/spot-suggestions";
import { seededFetch } from "@/lib/trip-client";
import type { SpotDto, TripDto } from "@/types/trip";

type AddSpotPayload = {
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

type TimelinePanelProps = {
  trip: TripDto;
  onTripUpdate: (trip: TripDto) => void;
  onDiscoverSpot: (spot: SpotDto) => void;
  onDaySelect?: (dayGroupId: string) => void;
  mapPickSpotId?: string | null;
  mapPickResult?: { spotId: string; lat: number; lng: number } | null;
  onStartMapPick?: (spotId: string) => void;
  onCancelMapPick?: () => void;
  onEditSpotChange?: (spotId: string | null) => void;
  externalEditSpotId?: string | null;
  onExternalEditHandled?: () => void;
  /** 切到某團員支線分頁時回報，讓右側地圖串該人路線（null＝主幹分頁） */
  onSproutFocusChange?: (memberId: string | null) => void;
};

export function TimelinePanel({
  trip,
  onTripUpdate,
  onDiscoverSpot,
  onDaySelect,
  mapPickSpotId,
  mapPickResult,
  onStartMapPick,
  onCancelMapPick,
  onEditSpotChange,
  externalEditSpotId,
  onExternalEditHandled,
  onSproutFocusChange,
}: TimelinePanelProps) {
  const [graftingId, setGraftingId] = useState<string | null>(null);
  const [branchTab, setBranchTab] = useState<"trunk" | "sprouts">("trunk");
  const [sproutMemberId, setSproutMemberId] = useState(
    trip.members[0]?.id ?? ""
  );

  useEffect(() => {
    onSproutFocusChange?.(branchTab === "sprouts" ? sproutMemberId : null);
  }, [branchTab, sproutMemberId, onSproutFocusChange]);

  useEffect(() => {
    return () => onSproutFocusChange?.(null);
  }, [onSproutFocusChange]);
  const [editingSpot, setEditingSpot] = useState<SpotDto | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [mapPickPending, setMapPickPending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [anchorLodging, setAnchorLodging] = useState(
    trip.anchorLodging ?? true
  );
  const [anchorLodgingSaving, setAnchorLodgingSaving] = useState(false);
  const [editIsTrunk, setEditIsTrunk] = useState(true);
  const hasLodging = tripHasLodging(trip.spots);

  useEffect(() => {
    setAnchorLodging(trip.anchorLodging ?? true);
  }, [trip.anchorLodging]);

  useEffect(() => {
    if (!externalEditSpotId) return;
    const spot = trip.spots.find((s) => s.id === externalEditSpotId);
    if (!spot) {
      onExternalEditHandled?.();
      return;
    }
    setEditingSpot(spot);
    setEditIsTrunk(spot.isTrunk);
    setEditOpen(true);
    onEditSpotChange?.(spot.id);
    onExternalEditHandled?.();
  }, [externalEditSpotId, trip.spots, onExternalEditHandled, onEditSpotChange]);

  useEffect(() => {
    if (!mapPickPending || !editingSpot || !mapPickResult) return;
    if (mapPickResult.spotId === editingSpot.id) {
      setMapPickPending(false);
      setEditOpen(true);
      onEditSpotChange?.(editingSpot.id);
    }
  }, [mapPickPending, mapPickResult, editingSpot, onEditSpotChange]);

  useEffect(() => {
    if (!mapPickPending || !editingSpot || mapPickSpotId) return;
    if (mapPickResult?.spotId === editingSpot.id) return;
    setMapPickPending(false);
    setEditOpen(true);
    onEditSpotChange?.(editingSpot.id);
  }, [
    mapPickPending,
    mapPickSpotId,
    mapPickResult,
    editingSpot,
    onEditSpotChange,
  ]);

  const previousEditingSpot = useMemo(() => {
    if (!editingSpot) return null;
    const { trunk, sprouts } = partitionSpots(trip.spots);
    const branch = editIsTrunk ? trunk : sprouts;
    const ordered = flattenGroups(
      groupSpotsByDay(branch, trip.startDate, trip.endDate)
    );
    const idx = ordered.findIndex((s) => s.id === editingSpot.id);
    return idx > 0 ? ordered[idx - 1] : null;
  }, [editingSpot, editIsTrunk, trip.spots, trip.startDate, trip.endDate]);

  async function refreshTrip() {
    const res = await fetch(`/api/trip/${trip.seedCode}`);
    if (res.ok) onTripUpdate(await res.json());
  }

  async function autoSchedule() {
    setScheduling(true);
    setScheduleMsg(null);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/auto-schedule`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "排程失敗");
      onTripUpdate(data.trip);
      setScheduleMsg(data.message ?? "已重新排程");
    } catch (e) {
      setScheduleMsg(e instanceof Error ? e.message : "排程失敗");
    } finally {
      setScheduling(false);
    }
  }

  async function handleAnchorLodgingChange(enabled: boolean) {
    setAnchorLodgingSaving(true);
    setScheduleMsg(null);
    try {
      const res = await seededFetch(`/api/trip/${trip.seedCode}/handbook`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchorLodging: enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "無法更新設定");
      setAnchorLodging(enabled);
      onTripUpdate({ ...trip, anchorLodging: enabled });
      setScheduleMsg(
        enabled
          ? "已開啟地圖住宿銜接（切換至單日檢視）"
          : "已關閉地圖住宿銜接"
      );
    } catch (e) {
      setScheduleMsg(e instanceof Error ? e.message : "無法更新設定");
    } finally {
      setAnchorLodgingSaving(false);
    }
  }

  async function handleGraft(spotId: string) {
    setGraftingId(spotId);
    try {
      const res = await seededFetch(`/api/spot/${spotId}/graft`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Graft failed");
      }
      await refreshTrip();
    } catch (e) {
      console.error(e);
    } finally {
      setGraftingId(null);
    }
  }

  function defaultCoordsForNewSpot(daySpots: SpotDto[]) {
    if (daySpots.length > 0) {
      return {
        latitude: daySpots[0].latitude,
        longitude: daySpots[0].longitude,
      };
    }
    const slug = inferTripDestination(trip.title, trip.spots);
    const centers: Record<string, { lat: number; lng: number }> = {
      taipei: { lat: 25.033, lng: 121.565 },
      tokyo: { lat: 35.6762, lng: 139.6503 },
      osaka: { lat: 34.6937, lng: 135.5023 },
      fukuoka: { lat: 33.59, lng: 130.4 },
      seoul: { lat: 37.5665, lng: 126.978 },
      busan: { lat: 35.1796, lng: 129.0756 },
    };
    const center = centers[slug] ?? centers.fukuoka;
    return {
      latitude: center.lat + (Math.random() - 0.5) * 0.01,
      longitude: center.lng + (Math.random() - 0.5) * 0.01,
    };
  }

  async function handleAddSpotToDay(
    dateKey: string,
    payload: AddSpotPayload,
    daySpots: SpotDto[],
    isTrunk: boolean
  ) {
    const member = trip.members.find((m) => m.id === sproutMemberId);
    const fallback = defaultCoordsForNewSpot(daySpots);
    const res = await seededFetch(`/api/trip/${trip.seedCode}/spot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        latitude:
          payload.latitude && payload.longitude
            ? payload.latitude
            : fallback.latitude,
        longitude:
          payload.latitude && payload.longitude
            ? payload.longitude
            : fallback.longitude,
        notes: payload.notes,
        isTrunk,
        scheduledAt: defaultScheduledAtForDay(dateKey, daySpots),
        memberId: isTrunk ? undefined : sproutMemberId || undefined,
        memberName: isTrunk ? undefined : member?.name,
      }),
    });
    if (!res.ok) throw new Error("Failed to add spot");
    await refreshTrip();
  }

  return (
    <>
      <div className="flex h-full min-h-[400px] flex-col rounded-xl border border-emerald-200 bg-white/90 shadow-sm">
        <div className="border-b border-emerald-100 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-emerald-950">{trip.title}</h2>
              <p className="font-mono text-xs text-emerald-600">
                Seed: {trip.seedCode} · 拖曳調整順序
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50/80 px-2.5 py-1.5 text-xs text-violet-900">
                <input
                  type="checkbox"
                  className="accent-violet-600"
                  checked={anchorLodging}
                  disabled={anchorLodgingSaving || scheduling}
                  onChange={(e) =>
                    void handleAnchorLodgingChange(e.target.checked)
                  }
                />
                住宿銜接
              </label>
              <Button
                size="sm"
                variant="outline"
                className="border-violet-200 text-violet-800 hover:bg-violet-50"
                onClick={() => void autoSchedule()}
                disabled={scheduling || anchorLodgingSaving}
              >
                {scheduling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                一鍵排程
              </Button>
            </div>
          </div>
          {scheduleMsg && (
            <p className="mt-2 text-xs text-violet-700">{scheduleMsg}</p>
          )}
          {anchorLodging && !hasLodging && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
              尚未標記住宿：請在主線新增飯店並勾選「🏨
              標記為住宿」，再切換地圖至單日（Day 1、Day 2…）即可看到路線起訖
            </p>
          )}
        </div>

        <Tabs
          value={branchTab}
          onValueChange={(v) => setBranchTab(v as "trunk" | "sprouts")}
          className="flex flex-1 flex-col px-4 pb-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="trunk" className="flex-1">
              🌳 主線行程
            </TabsTrigger>
            <TabsTrigger value="sprouts" className="flex-1">
              🌱 個人支線
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="trunk"
            className="flex-1 space-y-3 overflow-y-auto"
          >
            <SortableDayTimeline
              trip={trip}
              isTrunk
              onDaySelect={onDaySelect}
              onEdit={(s) => {
                setEditingSpot(s);
                setEditIsTrunk(true);
                setEditOpen(true);
                onEditSpotChange?.(s.id);
              }}
              onDiscover={onDiscoverSpot}
              onTripUpdate={onTripUpdate}
              onAddToDay={(dateKey, payload, daySpots) =>
                handleAddSpotToDay(dateKey, payload, daySpots, true)
              }
            />
          </TabsContent>

          <TabsContent
            value="sprouts"
            className="flex-1 space-y-3 overflow-y-auto"
          >
            {trip.members.length > 0 && (
              <div className="space-y-1">
                <select
                  className="h-8 w-full rounded-md border border-emerald-200 bg-white px-2 text-sm"
                  value={sproutMemberId}
                  onChange={(e) => setSproutMemberId(e.target.value)}
                >
                  {trip.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} 的支線
                    </option>
                  ))}
                </select>
                <p className="px-1 text-[11px] text-emerald-600">
                  切換團員查看各自支線；右側地圖會把主線與此人支線串成 1→S1→2→3
                </p>
              </div>
            )}
            <SortableDayTimeline
              trip={trip}
              isTrunk={false}
              filterMemberId={sproutMemberId}
              onDaySelect={onDaySelect}
              onEdit={(s) => {
                setEditingSpot(s);
                setEditIsTrunk(false);
                setEditOpen(true);
                onEditSpotChange?.(s.id);
              }}
              onDiscover={onDiscoverSpot}
              onGraft={handleGraft}
              graftingId={graftingId}
              onTripUpdate={onTripUpdate}
              onAddToDay={(dateKey, payload, daySpots) =>
                handleAddSpotToDay(dateKey, payload, daySpots, false)
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <SpotEditDialog
        spot={editingSpot}
        previousSpot={previousEditingSpot}
        open={editOpen && !mapPickPending}
        showLodgingToggle={editIsTrunk}
        onOpenChange={(open) => {
          if (!open && mapPickPending) {
            setMapPickPending(false);
            onCancelMapPick?.();
          }
          setEditOpen(open);
          if (!open) {
            setMapPickPending(false);
            onEditSpotChange?.(null);
          }
        }}
        onSaved={refreshTrip}
        mapPickActive={!!editingSpot && mapPickSpotId === editingSpot.id}
        onStartMapPick={
          editingSpot && onStartMapPick
            ? () => {
                setMapPickPending(true);
                setEditOpen(false);
                onEditSpotChange?.(null);
                onStartMapPick(editingSpot.id);
              }
            : undefined
        }
        mapPickResult={
          editingSpot && mapPickResult?.spotId === editingSpot.id
            ? { lat: mapPickResult.lat, lng: mapPickResult.lng }
            : null
        }
      />
    </>
  );
}
