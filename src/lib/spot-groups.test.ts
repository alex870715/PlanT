import { describe, expect, it } from "vitest";
import {
  buildReorderPayload,
  compareSpotsInGroup,
  groupSpotsByDay,
  reorderGroups,
} from "@/lib/spot-groups";
import type { SpotDto } from "@/types/trip";

function spot(
  id: string,
  sortOrder: number,
  scheduledAt: string | null
): SpotDto {
  return {
    id,
    name: id,
    latitude: 0,
    longitude: 0,
    sortOrder,
    isTrunk: true,
    scheduledAt,
    memberId: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    notes: null,
    openHours: null,
    phone: null,
    travelMode: null,
    travelMinutes: null,
  };
}

describe("spot reorder", () => {
  it("displays drag order by sortOrder, not original scheduledAt", () => {
    const a = spot("a", 0, "2026-06-01T10:00:00.000Z");
    const b = spot("b", 1, "2026-06-01T14:00:00.000Z");

    const groups = groupSpotsByDay(
      [a, b],
      "2026-06-01T00:00:00.000Z",
      "2026-06-01T00:00:00.000Z"
    );
    const reordered = reorderGroups(groups, "b", "a");
    const payload = buildReorderPayload(reordered, "2026-06-01T00:00:00.000Z");

    expect(payload.map((p) => p.id)).toEqual(["b", "a"]);
    expect(payload[0].sortOrder).toBe(0);
    expect(payload[1].sortOrder).toBe(1);
    expect(payload[0].scheduledAt! < payload[1].scheduledAt!).toBe(true);

    const merged = [
      { ...a, sortOrder: payload[1].sortOrder, scheduledAt: payload[1].scheduledAt },
      { ...b, sortOrder: payload[0].sortOrder, scheduledAt: payload[0].scheduledAt },
    ];
    const regrouped = groupSpotsByDay(
      merged,
      "2026-06-01T00:00:00.000Z",
      "2026-06-01T00:00:00.000Z"
    );
    const daySpots = regrouped.find((g) => g.dateKey === "2026-06-01")!.spots;
    expect(daySpots.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("compareSpotsInGroup prefers sortOrder", () => {
    const early = spot("early", 1, "2026-06-01T10:00:00.000Z");
    const late = spot("late", 0, "2026-06-01T14:00:00.000Z");
    expect(compareSpotsInGroup(late, early)).toBeLessThan(0);
  });
});
