import { dateKeyFromLocalDate, groupSpotsByDay, sortSpotsChronologically } from "@/lib/spot-groups";
import { partitionSpots } from "@/lib/spots";
import type { SpotDto } from "@/types/trip";

export function todayDateKey(): string {
  return dateKeyFromLocalDate(new Date());
}

export function isWithinTripDates(startDate: string, endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

/** 今日路線：主幹 +（可選）綁定團員的支線，依時間交錯 */
export function getTodayRouteSpots(
  spots: SpotDto[],
  tripStartDate: string,
  tripEndDate: string,
  memberId?: string | null
): SpotDto[] {
  const key = todayDateKey();
  const { trunk, sprouts } = partitionSpots(spots);
  const memberSprouts = memberId
    ? sprouts.filter((s) => s.memberId === memberId)
    : [];

  const groups = groupSpotsByDay(
    [...trunk, ...memberSprouts],
    tripStartDate,
    tripEndDate
  );
  const todayGroup = groups.find((g) => g.dateKey === key);
  return sortSpotsChronologically(todayGroup?.spots ?? []);
}

export function dayLabelForToday(tripStartDate: string, tripEndDate: string): string {
  const key = todayDateKey();
  const groups = groupSpotsByDay([], tripStartDate, tripEndDate);
  const g = groups.find((x) => x.dateKey === key);
  return g?.label ?? "今日";
}
