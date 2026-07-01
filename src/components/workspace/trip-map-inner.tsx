"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import L from "leaflet";
import { ChevronLeft, ChevronRight, MapPin, Pencil, Sparkles } from "lucide-react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatScheduledAt } from "@/lib/datetime";
import { formatTravelLeg } from "@/lib/travel";
import {
  buildMapDayFilters,
  flattenGroups,
  groupSpotsByDay,
  type MapDayFilter,
} from "@/lib/spot-groups";
import { computeMapViewTarget } from "@/lib/map-view";
import { useMapThemeColors, type MapThemeColors } from "@/lib/map-theme-colors";
import { partitionSpots, sortSpotsByOrder } from "@/lib/spots";
import type { SpotDto } from "@/types/trip";
import "leaflet/dist/leaflet.css";

type TripMapInnerProps = {
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
  /** 設定後＝聚焦某團員：地圖只顯示主幹＋此人支線，並串成一條路線 */
  focusMemberId?: string | null;
};

function MapClickPick({
  active,
  onPick,
}: {
  active: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** 切換 Day 時同步地圖視角（setView / fitBounds） */
function MapViewSync({
  viewKey,
  lat,
  lng,
  zoom,
  bbox,
}: {
  viewKey: string;
  lat: number | null;
  lng: number | null;
  zoom: number;
  bbox: string | null;
}) {
  const map = useMap();

  useLayoutEffect(() => {
    const apply = () => {
      map.invalidateSize({ animate: false });
      if (bbox) {
        const [south, west, north, east] = bbox.split(",").map(Number);
        map.fitBounds(
          [
            [south, west],
            [north, east],
          ],
          { padding: [56, 56], maxZoom: 14, animate: false }
        );
      } else if (lat != null && lng != null) {
        map.setView([lat, lng], zoom, { animate: false });
      }
    };

    if (map.getContainer().clientHeight > 0) apply();
    else map.whenReady(apply);
  }, [map, viewKey, lat, lng, zoom, bbox]);

  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);

  return null;
}

function createNumberedIcon(
  label: string,
  variant: "trunk" | "sprout",
  colors: MapThemeColors
) {
  const styles =
    variant === "trunk"
      ? {
          bg: colors.trunk.bg,
          border: colors.trunk.border,
          text: colors.trunk.text,
          size: 40,
        }
      : {
          bg: colors.sprout.bg,
          border: colors.sprout.border,
          text: colors.sprout.text,
          size: 34,
        };

  return L.divIcon({
    className: "plant-map-marker",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${styles.size}px;height:${styles.size}px;border-radius:50%;
      background:${styles.bg};border:3px solid ${styles.border};
      box-shadow:0 2px 10px rgba(0,0,0,0.28);
      font-size:${variant === "trunk" ? "16px" : "13px"};
      font-weight:700;color:${styles.text};font-family:system-ui,sans-serif;
      cursor:pointer;
    ">${label}</div>`,
    iconSize: [styles.size, styles.size],
    iconAnchor: [styles.size / 2, styles.size / 2],
    popupAnchor: [0, -styles.size / 2],
  });
}

function SpotPopup({
  orderLabel,
  spot,
  variant,
  dayLabel,
  onExplore,
  onEdit,
  onMove,
}: {
  orderLabel: string;
  spot: SpotDto;
  variant: "trunk" | "sprout";
  dayLabel?: string;
  onExplore?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
}) {
  return (
    <div className="min-w-[180px] font-sans text-sm">
      {dayLabel && (
        <p className="mb-1 text-[10px] font-medium text-emerald-600">{dayLabel}</p>
      )}
      <p
        className={
          variant === "trunk"
            ? "font-bold text-emerald-800"
            : "font-bold text-lime-800"
        }
      >
        {orderLabel} {spot.name}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        {variant === "trunk" ? "🌳 Trunk 主幹" : "🌱 Sprout 支線"}
        {spot.member ? ` · ${spot.member.name}` : ""}
      </p>
      {formatScheduledAt(spot.scheduledAt) && (
        <p className="mt-1.5 rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
          📅 {formatScheduledAt(spot.scheduledAt)}
        </p>
      )}
      {spot.openHours && (
        <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
          🕐 {spot.openHours}
        </p>
      )}
      {formatTravelLeg(spot.travelMode, spot.travelMinutes) && (
        <p className="mt-1 rounded bg-sky-50 px-2 py-1 text-xs text-sky-900">
          {formatTravelLeg(spot.travelMode, spot.travelMinutes)}
        </p>
      )}
      {spot.notes && <p className="mt-1 text-xs text-gray-500">{spot.notes}</p>}
      <div className="mt-2 flex flex-col gap-1.5">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
          >
            <Pencil className="h-3 w-3" />
            編輯景點
          </button>
        )}
        {onMove && (
          <button
            type="button"
            onClick={onMove}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-medium text-sky-900 hover:bg-sky-100"
          >
            <MapPin className="h-3 w-3" />
            移動座標
          </button>
        )}
        {onExplore && (
          <button
            type="button"
            onClick={onExplore}
            className="flex w-full items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-3 w-3" />
            探索美食與照片
          </button>
        )}
      </div>
    </div>
  );
}

const FUKUOKA_CENTER: [number, number] = [33.59, 130.4];

export function TripMapInner({
  spots,
  tripTitle,
  tripStartDate,
  tripEndDate,
  onSpotExplore,
  onSpotEdit,
  onSpotMove,
  onMoveModeDone,
  moveSpotId,
  selectedDayId: controlledDayId,
  onDayChange,
  draggableSpotId,
  mapPickActive,
  onMapPick,
  onMapPickCancel,
  onSpotLocationChange,
  focusMemberId,
}: TripMapInnerProps) {
  const focusMode = !!focusMemberId;
  const mapColors = useMapThemeColors();

  // 聚焦某人：主幹＋此人支線；否則只顯示主幹（各人支線只在自己分頁出現）
  const scopedSpots = useMemo(() => {
    if (focusMemberId) {
      return spots.filter((s) => s.isTrunk || s.memberId === focusMemberId);
    }
    return spots.filter((s) => s.isTrunk);
  }, [spots, focusMemberId]);

  const dayFilters = useMemo(
    () => buildMapDayFilters(scopedSpots, tripStartDate, tripEndDate),
    [scopedSpots, tripStartDate, tripEndDate]
  );

  const [internalDayId, setInternalDayId] = useState("all");
  const selectedDayId = controlledDayId ?? internalDayId;

  function selectDay(id: string) {
    if (onDayChange) onDayChange(id);
    else setInternalDayId(id);
  }

  useEffect(() => {
    if (!dayFilters.some((f) => f.id === selectedDayId)) {
      selectDay("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when filters change
  }, [dayFilters]);

  const activeFilter =
    dayFilters.find((f) => f.id === selectedDayId) ?? dayFilters[0];

  const { trunk: allTrunk, sprouts: allSprouts } = useMemo(
    () => partitionSpots(scopedSpots),
    [scopedSpots]
  );

  const isAllView = activeFilter.id === "all";

  const visibleTrunk = activeFilter.trunkSpots;
  const visibleSprouts = activeFilter.sproutSpots;
  const visibleAll = [...visibleTrunk, ...visibleSprouts];

  const mapViewTarget = useMemo(
    () => computeMapViewTarget(visibleTrunk, visibleSprouts, isAllView),
    [visibleTrunk, visibleSprouts, isAllView, selectedDayId]
  );

  const mapViewKey = useMemo(
    () =>
      `${selectedDayId}|${visibleTrunk.map((s) => s.id).join(",")}|${visibleSprouts.map((s) => s.id).join(",")}`,
    [selectedDayId, visibleTrunk, visibleSprouts]
  );

  const mapFocus = useMemo(() => {
    const target = mapViewTarget;
    if (target.mode === "point") {
      return {
        lat: target.lat,
        lng: target.lng,
        zoom: target.zoom,
        bbox: null as string | null,
      };
    }
    if (target.mode === "bounds") {
      const b = target.bounds;
      return {
        lat: null,
        lng: null,
        zoom: 12,
        bbox: `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`,
      };
    }
    return { lat: null, lng: null, zoom: 12, bbox: null };
  }, [mapViewTarget]);

  // 聚焦某人時：主幹＋此人支線依時間交錯成一條路線（1→S1→2→3）
  // 否則只連主幹
  const routePositions = useMemo(() => {
    const ordered = focusMode
      ? sortSpotsByOrder([...visibleTrunk, ...visibleSprouts])
      : visibleTrunk;
    return ordered.map((s) => [s.latitude, s.longitude] as [number, number]);
  }, [focusMode, visibleTrunk, visibleSprouts]);

  const globalTrunkOrder = useMemo(() => {
    const groups = groupSpotsByDay(allTrunk, tripStartDate, tripEndDate);
    return new Map(
      flattenGroups(groups).map((s, i) => [s.id, String(i + 1)])
    );
  }, [allTrunk, tripStartDate, tripEndDate]);

  const globalSproutOrder = useMemo(() => {
    const groups = groupSpotsByDay(allSprouts, tripStartDate, tripEndDate);
    return new Map(
      flattenGroups(groups).map((s, i) => [s.id, `S${i + 1}`])
    );
  }, [allSprouts, tripStartDate, tripEndDate]);

  const filterIndex = dayFilters.findIndex((f) => f.id === selectedDayId);

  function goPrevDay() {
    if (filterIndex > 0) selectDay(dayFilters[filterIndex - 1].id);
  }

  function goNextDay() {
    if (filterIndex < dayFilters.length - 1) {
      selectDay(dayFilters[filterIndex + 1].id);
    }
  }

  const initialCenter = useMemo((): [number, number] => {
    if (mapViewTarget.mode === "point") {
      return [mapViewTarget.lat, mapViewTarget.lng];
    }
    if (mapViewTarget.mode === "bounds") {
      const c = mapViewTarget.bounds.getCenter();
      return [c.lat, c.lng];
    }
    const first = scopedSpots.find((s) => s.isTrunk) ?? scopedSpots[0];
    if (first) return [first.latitude, first.longitude];
    return FUKUOKA_CENTER;
  }, [mapViewTarget, scopedSpots]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-emerald-200 shadow-sm">
      <MapDayToolbar
        filters={dayFilters}
        selectedId={selectedDayId}
        onSelect={selectDay}
        onPrev={goPrevDay}
        onNext={goNextDay}
        canPrev={filterIndex > 0}
        canNext={filterIndex < dayFilters.length - 1}
        activeFilter={activeFilter}
      />

      <div className="relative min-h-0 flex-1">
        <MapContainer
          center={initialCenter}
          zoom={11}
          className="absolute inset-0 z-0 h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewSync
            viewKey={mapViewKey}
            lat={mapFocus.lat}
            lng={mapFocus.lng}
            zoom={mapFocus.zoom}
            bbox={mapFocus.bbox}
          />
          {onMapPick && (
            <MapClickPick
              active={!!mapPickActive}
              onPick={onMapPick}
            />
          )}

          {routePositions.length >= 2 && (
            <Polyline
              key={`route-${mapColors.route.all}-${mapColors.route.focus}`}
              positions={routePositions}
              pathOptions={{
                color: focusMode
                  ? mapColors.route.focus
                  : isAllView
                    ? mapColors.route.all
                    : mapColors.route.day,
                weight: isAllView && !focusMode ? 4 : 5,
                opacity: 0.85,
                dashArray: isAllView && !focusMode ? undefined : "0",
              }}
            />
          )}

          {visibleTrunk.map((spot, index) => {
            const order = isAllView
              ? globalTrunkOrder.get(spot.id) ?? "?"
              : String(index + 1);
            return (
              <Marker
                key={`${spot.id}-${mapColors.trunk.bg}`}
                position={[spot.latitude, spot.longitude]}
                icon={createNumberedIcon(order, "trunk", mapColors)}
                zIndexOffset={1000 + index}
                draggable={draggableSpotId === spot.id}
                eventHandlers={{
                  dragend: (e) => {
                    if (draggableSpotId !== spot.id) return;
                    const { lat, lng } = e.target.getLatLng();
                    onSpotLocationChange?.(spot.id, lat, lng);
                  },
                }}
              >
                <Popup>
                  <SpotPopup
                    orderLabel={
                      isAllView ? `第 ${order} 站` : `此日第 ${order} 站`
                    }
                    spot={spot}
                    variant="trunk"
                    dayLabel={isAllView ? undefined : activeFilter.label}
                    onExplore={() => onSpotExplore?.(spot)}
                    onEdit={() => onSpotEdit?.(spot)}
                    onMove={() => onSpotMove?.(spot)}
                  />
                </Popup>
              </Marker>
            );
          })}

          {visibleSprouts.map((spot, index) => {
            const label = isAllView
              ? globalSproutOrder.get(spot.id) ?? "S?"
              : `S${index + 1}`;
            return (
              <Marker
                key={`${spot.id}-${mapColors.sprout.bg}`}
                position={[spot.latitude, spot.longitude]}
                icon={createNumberedIcon(label, "sprout", mapColors)}
                zIndexOffset={500 + index}
                draggable={draggableSpotId === spot.id}
                eventHandlers={{
                  dragend: (e) => {
                    if (draggableSpotId !== spot.id) return;
                    const { lat, lng } = e.target.getLatLng();
                    onSpotLocationChange?.(spot.id, lat, lng);
                  },
                }}
              >
                <Popup>
                  <SpotPopup
                    orderLabel={
                      isAllView ? `支線 ${label}` : `此日支線 ${label}`
                    }
                    spot={spot}
                    variant="sprout"
                    dayLabel={isAllView ? undefined : activeFilter.label}
                    onExplore={() => onSpotExplore?.(spot)}
                    onEdit={() => onSpotEdit?.(spot)}
                    onMove={() => onSpotMove?.(spot)}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[200px] rounded-lg border border-emerald-200/80 bg-white/90 px-3 py-2 text-xs shadow-md backdrop-blur">
          <p className="font-medium text-emerald-900">{tripTitle}</p>
          <p className="mt-0.5 text-emerald-700">{activeFilter.label}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            主幹 {visibleTrunk.length} 站
            {visibleSprouts.length > 0
              ? ` · 支線 ${visibleSprouts.length}`
              : ""}
            {focusMode
              ? " · 已串接個人支線 1→S1→2"
              : !isAllView && " · 依日編號 1→N"}
          </p>
        </div>

        {mapPickActive && (
          <div className="absolute inset-x-0 top-14 z-[1000] flex justify-center px-3">
            <div className="flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white shadow">
              <span>點擊地圖設定景點位置</span>
              {onMapPickCancel && (
                <button
                  type="button"
                  className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
                  onClick={() => onMapPickCancel()}
                >
                  取消
                </button>
              )}
            </div>
          </div>
        )}

        {moveSpotId && !mapPickActive && (
          <div className="absolute inset-x-0 top-14 z-[1000] flex justify-center px-3">
            <div className="flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white shadow">
              <span>拖曳標記調整位置</span>
              <button
                type="button"
                className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
                onClick={() => onMoveModeDone?.()}
              >
                完成
              </button>
            </div>
          </div>
        )}

        {visibleAll.length === 0 && !mapPickActive && (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
            <p className="text-sm text-emerald-800">
              此日尚無景點，請從左側拖曳或新增
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MapDayToolbar({
  filters,
  selectedId,
  onSelect,
  onPrev,
  onNext,
  canPrev,
  canNext,
  activeFilter,
}: {
  filters: MapDayFilter[];
  selectedId: string;
  onSelect: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  activeFilter: MapDayFilter;
}) {
  return (
    <div className="z-[1001] flex shrink-0 items-center gap-1 border-b border-emerald-100 bg-white/95 px-2 py-2 backdrop-blur">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label="前一日"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 gap-1 overflow-x-auto scrollbar-thin">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedId === f.id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
              f.trunkSpots.length + f.sproutSpots.length === 0 &&
                f.id !== "all" &&
                "opacity-50"
            )}
          >
            {f.id === "all" ? "全部" : f.shortLabel}
            {(f.trunkSpots.length > 0 || f.sproutSpots.length > 0) && (
              <span className="ml-1 opacity-80">
                ({f.trunkSpots.length + f.sproutSpots.length})
              </span>
            )}
          </button>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={onNext}
        disabled={!canNext}
        aria-label="後一日"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <span className="hidden text-[10px] text-emerald-600 sm:inline">
        {activeFilter.trunkSpots.length >= 2 ? "已連線" : ""}
      </span>
    </div>
  );
}
