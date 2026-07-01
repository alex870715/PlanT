import type { SpotDto } from "@/types/trip";

function compareSpots(a: SpotDto, b: SpotDto): number {
  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }
  if (a.scheduledAt && b.scheduledAt) {
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  }
  if (a.scheduledAt) return -1;
  if (b.scheduledAt) return 1;
  return 0;
}

export function sortSpotsByOrder(spots: SpotDto[]): SpotDto[] {
  return [...spots].sort(compareSpots);
}

export function partitionSpots(spots: SpotDto[]) {
  const trunk = sortSpotsByOrder(spots.filter((s) => s.isTrunk));
  const sprouts = sortSpotsByOrder(spots.filter((s) => !s.isTrunk));
  return { trunk, sprouts };
}
