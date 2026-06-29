"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { ActivityPanel } from "@/components/workspace/activity-panel";
import { TripMap } from "@/components/workspace/trip-map";
import { AiSettingsDialog } from "@/components/settings/ai-settings-dialog";
import { StorybookModal } from "@/components/workspace/storybook-modal";
import { MembersPanel } from "@/components/workspace/members-panel";
import { SpotDiscoverDialog } from "@/components/workspace/spot-discover-dialog";
import { TimelinePanel } from "@/components/workspace/timeline-panel";
import { TravelDayPanel } from "@/components/workspace/travel-day-panel";
import { TripExpensePanel } from "@/components/workspace/trip-expense-panel";
import { TripTasksPanel } from "@/components/workspace/trip-tasks-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import {
  getActiveMemberId,
  seededFetch,
  setActiveSeed,
} from "@/lib/trip-client";
import type { SpotDto, TripDto } from "@/types/trip";

type WorkspaceTab = "timeline" | "tasks" | "expense";

type PlantWorkspaceProps = {
  seedCode: string;
};

export function PlantWorkspace({ seedCode }: PlantWorkspaceProps) {
  const [trip, setTrip] = useState<TripDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discoverSpot, setDiscoverSpot] = useState<SpotDto | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [mapDayId, setMapDayId] = useState("all");
  const [draggableSpotId, setDraggableSpotId] = useState<string | null>(null);
  const [moveSpotId, setMoveSpotId] = useState<string | null>(null);
  const [mapPickSpotId, setMapPickSpotId] = useState<string | null>(null);
  const [mapPickResult, setMapPickResult] = useState<{
    spotId: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [externalEditSpotId, setExternalEditSpotId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("timeline");
  const [sproutFocusMemberId, setSproutFocusMemberId] = useState<string | null>(
    null
  );
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [remoteUpdate, setRemoteUpdate] = useState(false);
  const lastUpdatedAtRef = useRef<string>("");

  const handleSproutFocusChange = useCallback((memberId: string | null) => {
    setSproutFocusMemberId(memberId);
    if (memberId) setMapDayId("all");
  }, []);

  const handleIdentityChange = useCallback((memberId: string | null) => {
    setActiveMemberId(memberId);
  }, []);

  const fetchTripSilent = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip/${seedCode}`);
      if (!res.ok) return;
      const data: TripDto = await res.json();
      setTrip(data);
      lastUpdatedAtRef.current = data.updatedAt;
      setRemoteUpdate(false);
    } catch {
      /* ignore */
    }
  }, [seedCode]);

  async function updateSpotLocation(spotId: string, lat: number, lng: number) {
    const res = await seededFetch(`/api/spot/${spotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              spots: prev.spots.map((s) =>
                s.id === spotId
                  ? { ...s, latitude: updated.latitude, longitude: updated.longitude }
                  : s
              ),
            }
          : prev
      );
    }
  }

  const fetchTrip = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trip/${seedCode}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Trip not found");
      }
      setTrip(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [seedCode]);

  useEffect(() => {
    setActiveSeed(seedCode);
    setActiveMemberId(getActiveMemberId());
    return () => setActiveSeed(null);
  }, [seedCode]);

  useEffect(() => {
    if (trip?.updatedAt) {
      lastUpdatedAtRef.current = trip.updatedAt;
    }
  }, [trip?.updatedAt]);

  useEffect(() => {
    if (!trip) return;
    const poll = setInterval(async () => {
      try {
        const since = encodeURIComponent(lastUpdatedAtRef.current);
        const res = await fetch(`/api/trip/${seedCode}/sync?since=${since}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.changed) setRemoteUpdate(true);
      } catch {
        /* ignore */
      }
    }, 20_000);
    return () => clearInterval(poll);
  }, [trip, seedCode]);

  useEffect(() => {
    void fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    if (!mapPickSpotId) return;
    document
      .getElementById("trip-map-anchor")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [mapPickSpotId]);

  function openEditFromMap(spot: SpotDto) {
    setMoveSpotId(null);
    setExternalEditSpotId(spot.id);
  }

  function startMoveFromMap(spot: SpotDto) {
    setDraggableSpotId(null);
    setMoveSpotId(spot.id);
    document
      .getElementById("trip-map-anchor")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error ?? "Trip not found"}</p>
        <Link href="/" className="text-emerald-700 hover:underline">
          ← Back to home
        </Link>
      </div>
    );
  }

  const activeDraggableId = moveSpotId ?? draggableSpotId;
  const undoneTasks = trip.tasks.filter((t) => !t.done).length;
  const totalSpent = trip.expenses.reduce((sum, e) => sum + e.baseAmount, 0);
  const showMapOnMobile = activeTab === "timeline";

  return (
    <div className="flex min-h-screen flex-col">
      {remoteUpdate && (
        <div className="flex items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900">
          <span>其他人更新了行程，建議重新載入以取得最新內容</span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-sky-300"
            onClick={() => void fetchTripSilent()}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            重新載入
          </Button>
        </div>
      )}
      <header className="flex items-center justify-between border-b border-emerald-200 bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md p-1 text-emerald-700 hover:bg-emerald-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-emerald-950">PlanT Workspace</h1>
            <p className="text-xs text-emerald-600">
              {new Date(trip.startDate).toLocaleDateString()} –{" "}
              {new Date(trip.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AiSettingsDialog />
          <StorybookModal seedCode={trip.seedCode} />
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-2 lg:items-start lg:p-6">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          <MembersPanel
            trip={trip}
            activeMemberId={activeMemberId}
            onIdentityChange={handleIdentityChange}
            onTripUpdate={setTrip}
          />
          <ActivityPanel activities={trip.activities ?? []} />
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as WorkspaceTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="timeline" className="gap-1">
                🗺️ 行程
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-1">
                📋 訂位
                {undoneTasks > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-white">
                    {undoneTasks}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-1">
                💰 記帳
                {totalSpent > 0 && (
                  <span className="max-w-[7ch] truncate text-[10px] font-semibold text-rose-600">
                    {formatMoney(totalSpent, trip.currency)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <TravelDayPanel
                trip={trip}
                activeMemberId={activeMemberId}
                onTripUpdate={setTrip}
              />
              <TimelinePanel
                trip={trip}
                onTripUpdate={setTrip}
                onDaySelect={setMapDayId}
                onDiscoverSpot={(spot) => {
                  setDiscoverSpot(spot);
                  setDiscoverOpen(true);
                }}
                mapPickSpotId={mapPickSpotId}
                mapPickResult={mapPickResult}
                externalEditSpotId={externalEditSpotId}
                onExternalEditHandled={() => setExternalEditSpotId(null)}
                onStartMapPick={(spotId) => {
                  setMoveSpotId(null);
                  setDraggableSpotId(null);
                  setMapPickSpotId(spotId);
                  setMapPickResult(null);
                }}
                onCancelMapPick={() => {
                  setMapPickSpotId(null);
                  setMapPickResult(null);
                }}
                onEditSpotChange={(spotId) => {
                  setMoveSpotId(null);
                  setDraggableSpotId(spotId);
                }}
                onSproutFocusChange={handleSproutFocusChange}
              />
            </TabsContent>

            <TabsContent value="tasks">
              <TripTasksPanel
                trip={trip}
                activeMemberId={activeMemberId}
                onTripUpdate={setTrip}
              />
            </TabsContent>

            <TabsContent value="expense">
              <TripExpensePanel trip={trip} onTripUpdate={setTrip} />
            </TabsContent>
          </Tabs>
        </div>
        <div
          id="trip-map-anchor"
          className={`${showMapOnMobile ? "order-1" : "hidden"} w-full lg:order-2 lg:block lg:sticky lg:top-4 lg:self-start`}
        >
          <div className="mx-auto aspect-square w-full max-w-[min(100vw-1.5rem,520px)] touch-pan-y lg:max-w-none">
            <TripMap
              spots={trip.spots}
              tripTitle={trip.title}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
              focusMemberId={activeTab === "timeline" ? sproutFocusMemberId : null}
              selectedDayId={mapDayId}
              onDayChange={setMapDayId}
              draggableSpotId={activeDraggableId}
              moveSpotId={moveSpotId}
              mapPickActive={!!mapPickSpotId}
              onMapPick={(lat, lng) => {
                if (!mapPickSpotId) return;
                setMapPickResult({ spotId: mapPickSpotId, lat, lng });
                setMapPickSpotId(null);
              }}
              onMapPickCancel={() => {
                setMapPickSpotId(null);
                setMapPickResult(null);
              }}
              onSpotLocationChange={(id, lat, lng) =>
                void updateSpotLocation(id, lat, lng)
              }
              onSpotExplore={(spot) => {
                setDiscoverSpot(spot);
                setDiscoverOpen(true);
              }}
              onSpotEdit={openEditFromMap}
              onSpotMove={startMoveFromMap}
              onMoveModeDone={() => setMoveSpotId(null)}
            />
          </div>
        </div>
      </div>

      <SpotDiscoverDialog
        spot={discoverSpot}
        open={discoverOpen}
        onOpenChange={setDiscoverOpen}
      />
    </div>
  );
}
