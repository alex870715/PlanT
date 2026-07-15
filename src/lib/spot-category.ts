import { classifySpotCategory } from "@/lib/trip-handbook";
import { dateKeyFromIso } from "@/lib/spot-groups";
import type { SpotDto } from "@/types/trip";

export const FOOD_EMOJI = "🍽️";
export const SPOT_EMOJI = "📍";
export const LODGING_EMOJI = "🏨";

export function stripCategoryPrefix(notes: string): string {
  let text = notes.trim();
  if (text.startsWith(LODGING_EMOJI)) text = text.slice(LODGING_EMOJI.length).trim();
  else if (text.startsWith(FOOD_EMOJI)) text = text.slice(FOOD_EMOJI.length).trim();
  else if (text.startsWith(SPOT_EMOJI)) text = text.slice(SPOT_EMOJI.length).trim();
  return text;
}

export function isLodgingSpot(
  name: string,
  notes: string | null | undefined
): boolean {
  return classifySpotCategory(name, notes) === "lodging";
}

export function applyLodgingToNotes(
  notes: string | null,
  isLodging: boolean
): string | null {
  const body = stripCategoryPrefix(notes ?? "");
  if (isLodging) {
    return `${LODGING_EMOJI} ${body || "住宿基地"}`.trim();
  }
  return body || null;
}

export function tripHasLodging(
  spots: { name: string; notes: string | null; isTrunk: boolean }[]
): boolean {
  return spots.some(
    (s) => s.isTrunk && isLodgingSpot(s.name, s.notes)
  );
}

/** 解析某日應使用的住宿基地（供地圖路線起訖） */
export function resolveLodgingForDay(
  daySpots: SpotDto[],
  allLodgings: SpotDto[],
  dateKey: string
): SpotDto | null {
  const dayLodgings = daySpots.filter((s) => isLodgingSpot(s.name, s.notes));
  if (dayLodgings.length > 0) return dayLodgings[0];

  if (dateKey !== "unscheduled") {
    const scheduledOnDay = allLodgings.filter(
      (s) => s.scheduledAt && dateKeyFromIso(s.scheduledAt) === dateKey
    );
    if (scheduledOnDay.length > 0) return scheduledOnDay[0];
  }

  if (allLodgings.length === 1) return allLodgings[0];

  const unscheduledLodging = allLodgings.find((s) => !s.scheduledAt);
  if (unscheduledLodging) return unscheduledLodging;

  return allLodgings[0] ?? null;
}

/** 住宿銜接：路線順序為 住宿 → 活動 → 住宿 */
export function buildAnchoredMapRoute(
  dayTrunkSpots: SpotDto[],
  lodging: SpotDto | null,
  anchorLodging: boolean
): SpotDto[] {
  if (!anchorLodging || !lodging) {
    return dayTrunkSpots;
  }

  const activities = dayTrunkSpots.filter((s) => s.id !== lodging.id);
  if (activities.length === 0) return [lodging];
  return [lodging, ...activities, lodging];
}

export function extractMapDayDateKey(dayFilterId: string): string | null {
  if (!dayFilterId.startsWith("day-")) return null;
  return dayFilterId.slice(4);
}
