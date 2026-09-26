import { describe, it, expect } from "vitest";
import { evaluateCost, costThresholdsFromEnv, sumCosts, monthStartIso, DEFAULT_COST_THRESHOLDS } from "./cost-watch";

describe("cost watch", () => {
  it("stays quiet under the limits", () => {
    expect(evaluateCost(0.05, 1.2)).toEqual([]);
  });
  it("flags an expensive single grade", () => {
    const a = evaluateCost(0.8, 1);
    expect(a.map((x) => x.kind)).toEqual(["grade"]);
  });
  it("flags a heavy month, and both together", () => {
    expect(evaluateCost(0.1, 5).map((x) => x.kind)).toEqual(["month"]);
    expect(evaluateCost(0.6, 6).map((x) => x.kind)).toEqual(["grade", "month"]);
  });
  it("handles a missing grade cost", () => {
    expect(evaluateCost(null, 0.2)).toEqual([]);
  });
  it("reads thresholds from env and ignores junk", () => {
    expect(costThresholdsFromEnv({ COST_ALERT_MONTHLY_USD: "10", COST_ALERT_GRADE_USD: "1.5" })).toEqual({ monthlyUsd: 10, perGradeUsd: 1.5 });
    expect(costThresholdsFromEnv({ COST_ALERT_MONTHLY_USD: "abc", COST_ALERT_GRADE_USD: "-2" })).toEqual(DEFAULT_COST_THRESHOLDS);
    expect(costThresholdsFromEnv({})).toEqual(DEFAULT_COST_THRESHOLDS);
  });
  it("sums mixed cost values", () => {
    expect(sumCosts([{ cost: "0.04" }, { cost: 0.06 }, { cost: null }, { cost: "x" }])).toBeCloseTo(0.1);
  });
  it("finds the start of the month in UTC", () => {
    expect(monthStartIso(new Date("2026-09-26T18:00:00Z"))).toBe("2026-09-01T00:00:00.000Z");
  });
});
