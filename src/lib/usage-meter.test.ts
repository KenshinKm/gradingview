import { describe, it, expect } from "vitest";
import { usageLevel, usagePercent, usageFillClass } from "./usage-meter";

describe("usagePercent", () => {
  it("computes a clamped integer percentage", () => {
    expect(usagePercent(0, 15)).toBe(0);
    expect(usagePercent(3, 15)).toBe(20);
    expect(usagePercent(9, 15)).toBe(60);
    expect(usagePercent(12, 15)).toBe(80);
    expect(usagePercent(14, 15)).toBe(93);
    expect(usagePercent(15, 15)).toBe(100);
    expect(usagePercent(99, 15)).toBe(100);
    expect(usagePercent(0, 0)).toBe(0);
  });
});

describe("usageLevel thresholds", () => {
  it("0–50% used → green", () => {
    expect(usageLevel(0)).toBe("green");
    expect(usageLevel(usagePercent(3, 15))).toBe("green"); // 20%
    expect(usageLevel(49)).toBe("green");
  });
  it("50–75% used → yellow", () => {
    expect(usageLevel(50)).toBe("yellow");
    expect(usageLevel(usagePercent(9, 15))).toBe("yellow"); // 60%
    expect(usageLevel(74)).toBe("yellow");
  });
  it("75–90% used → orange", () => {
    expect(usageLevel(75)).toBe("orange");
    expect(usageLevel(usagePercent(12, 15))).toBe("orange"); // 80%
    expect(usageLevel(89)).toBe("orange");
  });
  it("90–100% used → red", () => {
    expect(usageLevel(90)).toBe("red");
    expect(usageLevel(usagePercent(14, 15))).toBe("red"); // 93%
    expect(usageLevel(usagePercent(15, 15))).toBe("red"); // 100%
  });
});

describe("usageFillClass", () => {
  it("maps to the semantic grade color classes", () => {
    expect(usageFillClass(20)).toBe("bg-grade-a");
    expect(usageFillClass(60)).toBe("bg-grade-c");
    expect(usageFillClass(80)).toBe("bg-grade-d");
    expect(usageFillClass(100)).toBe("bg-grade-f");
  });
});
