import { describe, expect, it } from "vitest";
import {
  formatMoney,
  getCurrencyMeta,
  inferCurrencyFromDestination,
  isSupportedCurrency,
  roundMoney,
} from "./currency";

describe("currency", () => {
  it("無小數位幣別四捨五入為整數", () => {
    expect(roundMoney(1234.6, "JPY")).toBe(1235);
    expect(roundMoney(1234.4, "KRW")).toBe(1234);
  });

  it("有小數位幣別保留兩位", () => {
    expect(roundMoney(10.005, "USD")).toBeCloseTo(10.01, 5);
    expect(roundMoney(10.004, "USD")).toBeCloseTo(10, 5);
  });

  it("formatMoney 依幣別小數位數格式化", () => {
    expect(formatMoney(1000, "JPY")).not.toMatch(/\./);
    expect(formatMoney(10.5, "USD")).toMatch(/10\.50/);
  });

  it("依目的地推測幣別", () => {
    expect(inferCurrencyFromDestination("tokyo")).toBe("JPY");
    expect(inferCurrencyFromDestination("seoul")).toBe("KRW");
    expect(inferCurrencyFromDestination("taipei")).toBe("TWD");
    expect(inferCurrencyFromDestination("unknown")).toBe("TWD");
  });

  it("未知幣別退回預設 TWD meta", () => {
    expect(getCurrencyMeta("XXX").code).toBe("TWD");
    expect(isSupportedCurrency("usd")).toBe(true);
    expect(isSupportedCurrency("zzz")).toBe(false);
  });
});
