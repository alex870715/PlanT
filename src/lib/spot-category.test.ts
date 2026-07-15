import { describe, expect, it } from "vitest";
import {
  buildAnchoredMapRoute,
  isLodgingSpot,
  resolveLodgingForDay,
} from "./spot-category";
import type { SpotDto } from "@/types/trip";

function spot(
  id: string,
  name: string,
  notes: string | null,
  extra?: Partial<SpotDto>
): SpotDto {
  return {
    id,
    name,
    latitude: 35.1,
    longitude: 129.0,
    openHours: null,
    phone: null,
    notes,
    scheduledAt: null,
    travelMode: null,
    travelMinutes: null,
    isTrunk: true,
    sortOrder: 0,
    memberId: null,
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...extra,
  };
}

describe("map lodging anchors", () => {
  const hotel = spot("h1", "西面飯店", "🏨 住宿基地");
  const food = spot("f1", "市場", "🍽️ 海鮮", { sortOrder: 1 });

  it("detects lodging spots", () => {
    expect(isLodgingSpot(hotel.name, hotel.notes)).toBe(true);
    expect(isLodgingSpot(food.name, food.notes)).toBe(false);
  });

  it("builds anchored route order", () => {
    const route = buildAnchoredMapRoute([food], hotel, true);
    expect(route.map((s) => s.id)).toEqual(["h1", "f1", "h1"]);
  });

  it("resolves trip-wide lodging when not on day list", () => {
    const resolved = resolveLodgingForDay([food], [hotel], "2026-07-01");
    expect(resolved?.id).toBe("h1");
  });
});
