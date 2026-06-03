import type { SpotDto } from "@/types/trip";
import { tripDayCount } from "@/lib/trip-dates";

type SchedulableSpot = {
  id: string;
  latitude: number;
  longitude: number;
};

function dist(a: SchedulableSpot, b: SchedulableSpot): number {
  const dlat = a.latitude - b.latitude;
  const dlng = a.longitude - b.longitude;
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/** 依地理距離分群到各天 */
function clusterByDays<T extends SchedulableSpot>(
  spots: T[],
  dayCount: number
): T[][] {
  if (spots.length === 0) return Array.from({ length: dayCount }, () => []);
  if (dayCount <= 1) return [spots];

  const centroids: { lat: number; lng: number }[] = [];
  const step = Math.max(1, Math.floor(spots.length / dayCount));
  for (let d = 0; d < dayCount; d++) {
    const seed = spots[Math.min(d * step, spots.length - 1)];
    centroids.push({ lat: seed.latitude, lng: seed.longitude });
  }

  const buckets: T[][] = Array.from({ length: dayCount }, () => []);

  for (const spot of spots) {
    let best = 0;
    let bestD = Infinity;
    for (let d = 0; d < dayCount; d++) {
      const c = centroids[d];
      const dlat = spot.latitude - c.lat;
      const dlng = spot.longitude - c.lng;
      const distSq = dlat * dlat + dlng * dlng;
      if (distSq < bestD) {
        bestD = distSq;
        best = d;
      }
    }
    buckets[best].push(spot);
  }

  return buckets;
}

/** 單日內最近鄰排序 */
function orderDayRoute<T extends SchedulableSpot>(spots: T[]): T[] {
  if (spots.length <= 1) return spots;
  const remaining = [...spots];
  const ordered: T[] = [];
  ordered.push(remaining.shift()!);
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = dist(last, remaining[i]);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

export type ScheduledSpotUpdate = {
  id: string;
  scheduledAt: string;
  sortOrder: number;
};

/** 主幹景點依天數 + 地理聚類排程（09:00 起每站約 2.5h） */
export function buildGeoSchedule(
  trunkSpots: SpotDto[],
  tripStartDate: string,
  tripEndDate: string
): ScheduledSpotUpdate[] {
  const tripStart = new Date(tripStartDate);
  tripStart.setHours(0, 0, 0, 0);
  const dayCount = tripDayCount(new Date(tripStartDate), new Date(tripEndDate));
  const buckets = clusterByDays(trunkSpots, dayCount);

  const updates: ScheduledSpotUpdate[] = [];
  let globalOrder = 0;

  buckets.forEach((bucket, dayIndex) => {
    const ordered = orderDayRoute(bucket);
    ordered.forEach((spot, slotIndex) => {
      const at = new Date(tripStart);
      at.setDate(tripStart.getDate() + dayIndex);
      at.setHours(9 + slotIndex * 2, 0, 0, 0);
      updates.push({
        id: spot.id,
        scheduledAt: at.toISOString(),
        sortOrder: globalOrder++,
      });
    });
  });

  return updates;
}
