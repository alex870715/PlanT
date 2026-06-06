"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TripMap } from "@/components/workspace/trip-map";
import { AiSettingsDialog } from "@/components/settings/ai-settings-dialog";
import { StorybookModal } from "@/components/workspace/storybook-modal";
import { MembersPanel } from "@/components/workspace/members-panel";
import { SpotDiscoverDialog } from "@/components/workspace/spot-discover-dialog";
import { TimelinePanel } from "@/components/workspace/timeline-panel";
import { TripExpensePanel } from "@/components/workspace/trip-expense-panel";
import { TripTasksPanel } from "@/components/workspace/trip-tasks-panel";
import type { SpotDto, TripDto } from "@/types/trip";

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

  async function updateSpotLocation(spotId: string, lat: number, lng: number) {
    const res = await fetch(`/api/spot/${spotId}`, {
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

  return (
    <div className="flex min-h-screen flex-col">
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
          <MembersPanel trip={trip} onTripUpdate={setTrip} />
          <TripTasksPanel trip={trip} onTripUpdate={setTrip} />
          <TripExpensePanel trip={trip} onTripUpdate={setTrip} />
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
          />
        </div>
        <div
          id="trip-map-anchor"
          className="order-1 w-full lg:order-2 lg:sticky lg:top-4 lg:self-start"
        >
          <div className="mx-auto aspect-square w-full max-w-[min(100vw-1.5rem,520px)] touch-pan-y lg:max-w-none">
            <TripMap
              spots={trip.spots}
              tripTitle={trip.title}
              tripStartDate={trip.startDate}
              tripEndDate={trip.endDate}
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
