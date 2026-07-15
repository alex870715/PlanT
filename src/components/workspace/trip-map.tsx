"use client";

import dynamic from "next/dynamic";
import type { SpotDto } from "@/types/trip";

const TripMapInner = dynamic(
  () => import("./trip-map-inner").then((m) => m.TripMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/30">
        <p className="text-sm text-emerald-700">載入地圖中…</p>
      </div>
    ),
  }
);

type TripMapProps = {
  spots: SpotDto[];
  tripTitle: string;
  tripStartDate: string;
  tripEndDate: string;
  onSpotExplore?: (spot: SpotDto) => void;
  onSpotEdit?: (spot: SpotDto) => void;
  onSpotMove?: (spot: SpotDto) => void;
  onMoveModeDone?: () => void;
  moveSpotId?: string | null;
  selectedDayId?: string;
  onDayChange?: (dayId: string) => void;
  draggableSpotId?: string | null;
  mapPickActive?: boolean;
  onMapPick?: (lat: number, lng: number) => void;
  onMapPickCancel?: () => void;
  onSpotLocationChange?: (spotId: string, lat: number, lng: number) => void;
  focusMemberId?: string | null;
  anchorLodging?: boolean;
};

export function TripMap({
  spots,
  tripTitle,
  tripStartDate,
  tripEndDate,
  onSpotExplore,
  onSpotEdit,
  onSpotMove,
  onMoveModeDone,
  moveSpotId,
  selectedDayId,
  onDayChange,
  draggableSpotId,
  mapPickActive,
  onMapPick,
  onMapPickCancel,
  onSpotLocationChange,
  focusMemberId,
  anchorLodging,
}: TripMapProps) {
  return (
    <TripMapInner
      spots={spots}
      tripTitle={tripTitle}
      tripStartDate={tripStartDate}
      tripEndDate={tripEndDate}
      onSpotExplore={onSpotExplore}
      onSpotEdit={onSpotEdit}
      onSpotMove={onSpotMove}
      onMoveModeDone={onMoveModeDone}
      moveSpotId={moveSpotId}
      selectedDayId={selectedDayId}
      onDayChange={onDayChange}
      draggableSpotId={draggableSpotId}
      mapPickActive={mapPickActive}
      onMapPick={onMapPick}
      onMapPickCancel={onMapPickCancel}
      onSpotLocationChange={onSpotLocationChange}
      focusMemberId={focusMemberId}
      anchorLodging={anchorLodging}
    />
  );
}
