import { describe, expect, it } from "vitest";
import {
  estimateTravelMinutes,
  formatTravelLeg,
  haversineKm,
} from "./travel";

describe("travel", () => {
  it("haversineKm 計算合理距離", () => {
    // 東京站 -> 新宿站 約 6 公里
    const km = haversineKm(35.681, 139.767, 35.69, 139.7);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(8);
  });

  it("estimateTravelMinutes 至少 1 分鐘且步行慢於開車", () => {
    const walk = estimateTravelMinutes(35.68, 139.76, 35.69, 139.7, "walk");
    const drive = estimateTravelMinutes(35.68, 139.76, 35.69, 139.7, "drive");
    expect(walk).toBeGreaterThanOrEqual(1);
    expect(walk).toBeGreaterThan(drive);
  });

  it("formatTravelLeg 在無資料時回傳 null", () => {
    expect(formatTravelLeg(null, 10)).toBeNull();
    expect(formatTravelLeg("walk", 0)).toBeNull();
    expect(formatTravelLeg("walk", 15)).toContain("15");
  });
});
