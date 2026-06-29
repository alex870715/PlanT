import { describe, expect, it } from "vitest";
import {
  createExpenseSchema,
  discoverCardSchema,
  plantTripBodySchema,
} from "./validation";

describe("validation schemas", () => {
  it("discoverCardSchema 套用預設並驗證座標範圍", () => {
    const parsed = discoverCardSchema.parse({
      id: "x1",
      name: "  測試景點 ",
      latitude: 35.6,
      longitude: 139.7,
    });
    expect(parsed.name).toBe("測試景點");
    expect(parsed.category).toBe("spot");
    expect(parsed.popularity).toBe(50);
    expect(parsed.tags).toEqual([]);

    expect(() =>
      discoverCardSchema.parse({
        id: "x",
        name: "n",
        latitude: 200,
        longitude: 0,
      })
    ).toThrow();
  });

  it("plantTripBodySchema 要求至少一張卡", () => {
    expect(
      plantTripBodySchema.safeParse({ destination: "Tokyo", liked: [] }).success
    ).toBe(false);
    expect(
      plantTripBodySchema.safeParse({
        destination: "Tokyo",
        liked: [{ id: "a", name: "A", latitude: 1, longitude: 2 }],
      }).success
    ).toBe(true);
  });

  it("createExpenseSchema 拒絕非正數金額", () => {
    expect(
      createExpenseSchema.safeParse({
        title: "晚餐",
        paidByMemberId: "m1",
        amount: 0,
      }).success
    ).toBe(false);
    expect(
      createExpenseSchema.safeParse({
        title: "晚餐",
        paidByMemberId: "m1",
        amount: 500,
      }).success
    ).toBe(true);
  });
});
