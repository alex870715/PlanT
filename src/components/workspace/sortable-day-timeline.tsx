"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotAddPanel } from "@/components/workspace/spot-add-panel";
import { cn } from "@/lib/utils";
import { formatScheduledAt } from "@/lib/datetime";
import {
  buildReorderPayload,
  groupSpotsByDay,
  reorderGroups,
  type SpotDayGroup,
} from "@/lib/spot-groups";
import { partitionSpots } from "@/lib/spots";
import { TravelLegBadge } from "@/components/workspace/travel-leg-badge";
import type { SpotDto, TripDto } from "@/types/trip";

type AddSpotPayload = {
  name: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

type SortableDayTimelineProps = {
  trip: TripDto;
  isTrunk: boolean;
  /** 支線分頁時，只顯示此團員的支線 */
  filterMemberId?: string;
  onDaySelect?: (dayGroupId: string) => void;
  onEdit: (spot: SpotDto) => void;
  onDiscover: (spot: SpotDto) => void;
  onGraft?: (spotId: string) => void;
  graftingId?: string | null;
  onTripUpdate: (trip: TripDto) => void;
  onAddToDay?: (
    dateKey: string,
    payload: AddSpotPayload,
    daySpots: SpotDto[]
  ) => Promise<void>;
};

export function SortableDayTimeline({
  trip,
  isTrunk,
  filterMemberId,
  onDaySelect,
  onEdit,
  onDiscover,
  onGraft,
  graftingId,
  onTripUpdate,
  onAddToDay,
}: SortableDayTimelineProps) {
  const [openAddDayId, setOpenAddDayId] = useState<string | null>(null);
  const [addName, setAddName] = useState("");
  const [addingDayId, setAddingDayId] = useState<string | null>(null);
  const branchSpots = useMemo(() => {
    const { trunk, sprouts } = partitionSpots(trip.spots);
    if (isTrunk) return trunk;
    return filterMemberId
      ? sprouts.filter((s) => s.memberId === filterMemberId)
      : sprouts;
  }, [trip.spots, isTrunk, filterMemberId]);

  const initialGroups = useMemo(
    () => groupSpotsByDay(branchSpots, trip.startDate, trip.endDate),
    [branchSpots, trip.startDate, trip.endDate]
  );

  const [groups, setGroups] = useState<SpotDayGroup[]>(initialGroups);
  const [activeSpot, setActiveSpot] = useState<SpotDto | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const g of groups) {
      for (const s of g.spots) {
        i += 1;
        map.set(s.id, isTrunk ? String(i) : `S${i}`);
      }
    }
    return map;
  }, [groups, isTrunk]);

  async function persistOrder(nextGroups: SpotDayGroup[]) {
    setSaving(true);
    try {
      const items = buildReorderPayload(nextGroups, trip.startDate);
      const res = await fetch(`/api/trip/${trip.seedCode}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTrunk, items }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      onTripUpdate(await res.json());
    } catch (e) {
      console.error(e);
      setGroups(initialGroups);
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const spot = branchSpots.find((s) => s.id === event.active.id);
    setActiveSpot(spot ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverContainerId(null);
      return;
    }
    const overId = String(over.id);
    const container = groups.find((g) => g.id === overId);
    if (container) {
      setOverContainerId(container.id);
      return;
    }
    const spotGroup = groups.find((g) =>
      g.spots.some((s) => s.id === overId)
    );
    setOverContainerId(spotGroup?.id ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSpot(null);
    setOverContainerId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const next = reorderGroups(groups, String(active.id), String(over.id));
    setGroups(next);
    void persistOrder(next);
  }

  async function submitAddToDay(group: SpotDayGroup) {
    if (!onAddToDay || !addName.trim()) return;
    setAddingDayId(group.id);
    try {
      await onAddToDay(
        group.dateKey,
        { name: addName.trim(), latitude: 0, longitude: 0 },
        group.spots
      );
      setAddName("");
      setOpenAddDayId(null);
    } finally {
      setAddingDayId(null);
    }
  }

  async function submitPayloadToDay(
    group: SpotDayGroup,
    payload: AddSpotPayload
  ) {
    if (!onAddToDay) return;
    setAddingDayId(group.id);
    try {
      await onAddToDay(group.dateKey, payload, group.spots);
      setAddName("");
      setOpenAddDayId(null);
    } finally {
      setAddingDayId(null);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setOverContainerId(null)}
    >
      <div
        className={cn(
          "space-y-4",
          saving && "pointer-events-none opacity-60"
        )}
      >
        {groups.map((group) => (
          <DroppableDayColumn
            key={group.id}
            group={group}
            isOver={overContainerId === group.id}
            orderMap={orderMap}
            variant={isTrunk ? "trunk" : "sprout"}
            onDaySelect={onDaySelect}
            onEdit={onEdit}
            onDiscover={onDiscover}
            onGraft={onGraft}
            graftingId={graftingId}
            canAdd={!!onAddToDay}
            addOpen={openAddDayId === group.id}
            addName={addName}
            adding={addingDayId === group.id}
            onToggleAdd={() => {
              if (openAddDayId === group.id) {
                setOpenAddDayId(null);
                setAddName("");
              } else {
                setOpenAddDayId(group.id);
                setAddName("");
              }
            }}
            tripTitle={trip.title}
            tripSpots={trip.spots}
            onAddNameChange={setAddName}
            onSubmitAdd={() => void submitAddToDay(group)}
            onSelectPayload={(payload) =>
              void submitPayloadToDay(group, payload)
            }
          />
        ))}
      </div>

      <DragOverlay>
        {activeSpot ? (
          <div className="rounded-lg border-2 border-emerald-400 bg-white p-3 shadow-xl">
            <p className="font-medium">{activeSpot.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableDayColumn({
  group,
  isOver,
  orderMap,
  variant,
  onDaySelect,
  onEdit,
  onDiscover,
  onGraft,
  graftingId,
  canAdd,
  addOpen,
  addName,
  adding,
  onToggleAdd,
  tripTitle,
  tripSpots,
  onAddNameChange,
  onSubmitAdd,
  onSelectPayload,
}: {
  group: SpotDayGroup;
  isOver: boolean;
  orderMap: Map<string, string>;
  variant: "trunk" | "sprout";
  onDaySelect?: (dayGroupId: string) => void;
  onEdit: (spot: SpotDto) => void;
  onDiscover: (spot: SpotDto) => void;
  onGraft?: (spotId: string) => void;
  graftingId?: string | null;
  canAdd?: boolean;
  addOpen?: boolean;
  addName?: string;
  adding?: boolean;
  onToggleAdd?: () => void;
  tripTitle?: string;
  tripSpots?: SpotDto[];
  onAddNameChange?: (v: string) => void;
  onSubmitAdd?: () => void;
  onSelectPayload?: (payload: AddSpotPayload) => void;
}) {
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({
    id: group.id,
    data: { type: "day-column", dateKey: group.dateKey },
  });

  const highlight = isOver || isOverDroppable;
  const spotIds = group.spots.map((s) => s.id);

  return (
    <div>
      <div className="sticky top-0 z-10 mb-2 flex items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-1 backdrop-blur">
        <button
          type="button"
          onClick={() => onDaySelect?.(group.id)}
          className={cn(
            "min-w-0 flex-1 text-left text-xs font-bold text-emerald-900 transition-colors",
            onDaySelect && "cursor-pointer hover:text-emerald-700"
          )}
        >
          {group.label}
          <span className="ml-1 font-normal text-emerald-700">
            ({group.spots.length} 站)
          </span>
          {onDaySelect && group.spots.length > 0 && (
            <span className="ml-1 text-[10px] font-normal text-emerald-600">
              · 地圖
            </span>
          )}
        </button>
        {canAdd && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-emerald-700 hover:bg-emerald-200/80"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAdd?.();
            }}
            aria-label={`在${group.label}新增景點`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {addOpen && (
        <SpotAddPanel
          tripTitle={tripTitle ?? ""}
          tripSpots={tripSpots ?? []}
          daySpots={group.spots}
          addName={addName ?? ""}
          adding={!!adding}
          onAddNameChange={(v) => onAddNameChange?.(v)}
          onSelectPayload={(payload) => onSelectPayload?.(payload)}
          onSubmitCustom={() => onSubmitAdd?.()}
        />
      )}

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[56px] rounded-lg border-2 border-dashed p-1 transition-colors",
          highlight
            ? "border-emerald-500 bg-emerald-100/60"
            : "border-emerald-200/60 bg-emerald-50/20",
          group.spots.length === 0 && "flex items-center justify-center"
        )}
      >
        {group.spots.length === 0 ? (
          <p
            className={cn(
              "px-2 py-3 text-center text-xs",
              highlight ? "font-medium text-emerald-800" : "text-muted-foreground"
            )}
          >
            {highlight ? "放開以加入此日" : "拖曳景點到此日"}
          </p>
        ) : (
          <SortableContext items={spotIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {group.spots.map((spot, spotIndex) => (
                <li key={spot.id}>
                  {spotIndex > 0 && (
                    <TravelLegBadge
                      travelMode={spot.travelMode}
                      travelMinutes={spot.travelMinutes}
                    />
                  )}
                  <SortableSpotCard
                    spot={spot}
                    orderLabel={orderMap.get(spot.id) ?? "?"}
                    variant={variant}
                    onEdit={() => onEdit(spot)}
                    onDiscover={() => onDiscover(spot)}
                    onGraft={onGraft}
                    graftingId={graftingId}
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

function SortableSpotCard({
  spot,
  orderLabel,
  variant,
  onEdit,
  onDiscover,
  onGraft,
  graftingId,
}: {
  spot: SpotDto;
  orderLabel: string;
  variant: "trunk" | "sprout";
  onEdit: () => void;
  onDiscover: () => void;
  onGraft?: (id: string) => void;
  graftingId?: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: spot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const timeLabel = formatScheduledAt(spot.scheduledAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        variant === "sprout"
          ? "rounded-lg border border-lime-200 bg-gradient-to-r from-lime-50 to-emerald-50/50 p-3"
          : "rounded-lg border border-emerald-100 bg-white/90 p-3 shadow-sm"
      }
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-emerald-600 hover:bg-emerald-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="拖曳排序"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
          onClick={onDiscover}
        >
          <span
            className={
              variant === "sprout"
                ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-200 text-xs font-bold text-lime-900"
                : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
            }
          >
            {orderLabel}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-emerald-950 hover:underline">
              {spot.name}
            </p>
            {timeLabel && (
              <p className="mt-0.5 text-xs font-semibold text-amber-800">
                📅 {timeLabel}
              </p>
            )}
            {spot.member && (
              <p className="text-xs text-lime-700">🌱 {spot.member.name}</p>
            )}
            {spot.openHours && (
              <p className="mt-1 text-xs text-amber-700/90">🕐 {spot.openHours}</p>
            )}
            {spot.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{spot.notes}</p>
            )}
          </div>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label="編輯"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      {variant === "sprout" && onGraft && (
        <Button
          variant="sprout"
          size="sm"
          className="mt-2 w-full"
          onClick={() => onGraft(spot.id)}
          disabled={graftingId === spot.id}
        >
          Graft to Trunk 🌿
        </Button>
      )}
    </div>
  );
}
