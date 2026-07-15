import { describe, expect, it } from "vitest";
import {
  buildHandbookSlides,
  buildTripHandbookInputFromTrip,
  classifySpotCategory,
  inferTripPurpose,
} from "@/lib/trip-handbook";
import { guidePurpose } from "@/lib/handbook-narrative";

describe("classifySpotCategory", () => {
  it("detects lodging from emoji and keywords", () => {
    expect(classifySpotCategory("西面飯店", "🏨 Check-in")).toBe("lodging");
    expect(classifySpotCategory("Hotel ABC", null)).toBe("lodging");
    expect(classifySpotCategory("民宿小院", null)).toBe("lodging");
  });
});

describe("guidePurpose", () => {
  it("writes practical Chinese guide copy", () => {
    const text = guidePurpose("釜山", 5, ["札嘎其市場"], ["甘川文化村"], ["Alex"]);
    expect(text).toContain("釜山");
    expect(text).toContain("行程手冊");
    expect(text).not.toContain("童話");
  });
});

describe("buildHandbookSlides", () => {
  const baseTrip = {
    seedCode: "123456",
    title: "釜山 探索之旅 🌿",
    startDate: new Date("2026-07-01T09:00:00"),
    endDate: new Date("2026-07-05T18:00:00"),
    members: [{ name: "Alex" }],
    spots: [
      {
        name: "札嘎其市場",
        notes: "🍽️ 活海鮮、現做刺身（南浦） · 聲量 93",
        openHours: null,
        scheduledAt: new Date("2026-07-01T12:00:00"),
        travelMode: null,
        travelMinutes: null,
        isTrunk: true,
        sortOrder: 0,
        latitude: 35.09,
        longitude: 129.03,
        member: null,
      },
      {
        name: "甘川文化村",
        notes: "📍 彩色階梯村落（西面） · 聲量 94",
        openHours: null,
        scheduledAt: new Date("2026-07-01T15:30:00"),
        travelMode: "walk",
        travelMinutes: 18,
        isTrunk: true,
        sortOrder: 1,
        latitude: 35.09,
        longitude: 129.01,
        member: null,
      },
    ],
  };

  it("builds handbook chapters with route and transport", () => {
    const input = buildTripHandbookInputFromTrip(baseTrip, {
      destinationLabel: "釜山",
    });
    const purpose = inferTripPurpose(input);
    const slides = buildHandbookSlides(input, purpose);

    expect(slides[0].type).toBe("cover");
    if (slides[0].type === "cover") {
      expect(slides[0].subtitle).toContain("旅遊手冊");
    }
    expect(slides.some((s) => s.type === "food-chapter")).toBe(true);
    expect(slides.some((s) => s.type === "spot-chapter")).toBe(true);
    expect(slides.some((s) => s.type === "route")).toBe(true);
    expect(slides.some((s) => s.type === "transport")).toBe(true);
  });

  it("anchors daily routes with lodging when enabled", () => {
    const tripWithHotel = {
      ...baseTrip,
      spots: [
        {
          name: "西面飯店",
          notes: "🏨 4 晚住宿基地（西面）",
          openHours: null,
          scheduledAt: null,
          travelMode: null,
          travelMinutes: null,
          isTrunk: true,
          sortOrder: 0,
          latitude: 35.16,
          longitude: 129.05,
          member: null,
        },
        ...baseTrip.spots,
      ],
    };

    const input = buildTripHandbookInputFromTrip(tripWithHotel, {
      destinationLabel: "釜山",
    });
    const purpose = inferTripPurpose(input);
    const slides = buildHandbookSlides(input, purpose, { anchorLodging: true });
    const route = slides.find((s) => s.type === "route");

    expect(route?.type).toBe("route");
    if (route?.type === "route") {
      expect(route.narrative).toContain("西面飯店");
      expect(route.steps[0]).toMatchObject({
        kind: "spot",
        name: "西面飯店",
        lodgingRole: "start",
      });
      expect(route.steps[route.steps.length - 1]).toMatchObject({
        kind: "spot",
        name: "西面飯店",
        lodgingRole: "end",
      });
    }
  });

  it("skips lodging anchors when disabled", () => {
    const tripWithHotel = {
      ...baseTrip,
      spots: [
        {
          name: "西面飯店",
          notes: "🏨 4 晚住宿基地（西面）",
          openHours: null,
          scheduledAt: null,
          travelMode: null,
          travelMinutes: null,
          isTrunk: true,
          sortOrder: 0,
          latitude: 35.16,
          longitude: 129.05,
          member: null,
        },
        ...baseTrip.spots,
      ],
    };

    const input = buildTripHandbookInputFromTrip(tripWithHotel);
    const slides = buildHandbookSlides(input, "test", { anchorLodging: false });
    const route = slides.find((s) => s.type === "route");

    if (route?.type === "route") {
      expect(route.narrative).not.toContain("西面飯店");
      expect(route.steps.every((s) => s.kind !== "spot" || s.name !== "西面飯店")).toBe(
        true
      );
    }
  });
});
