import { describe, it, expect } from "vitest";
import {
  letterForPercent,
  percentFromSections,
  totalPointsPossible,
  totalPointsEarned,
  estimatedRange,
  clampPercent,
} from "./grade-math";

const cat = (points_earned: number, points_possible: number) => ({
  points_earned,
  points_possible,
});

describe("letterForPercent", () => {
  it("maps common percentages to US letter grades", () => {
    expect(letterForPercent(98)).toBe("A+");
    expect(letterForPercent(93)).toBe("A");
    expect(letterForPercent(90)).toBe("A-");
    expect(letterForPercent(87)).toBe("B+");
    expect(letterForPercent(83)).toBe("B");
    expect(letterForPercent(75)).toBe("C");
    expect(letterForPercent(72)).toBe("C-");
    expect(letterForPercent(55)).toBe("F");
  });
  it("clamps out-of-range input", () => {
    expect(letterForPercent(140)).toBe("A+");
    expect(letterForPercent(-5)).toBe("F");
  });
});

describe("percentFromSections", () => {
  it("returns null with no sections", () => {
    expect(percentFromSections([])).toBeNull();
  });

  it("computes a correct percentage on a 100-point rubric", () => {
    expect(
      percentFromSections([cat(18, 20), cat(22, 25), cat(17, 20), cat(14, 15), cat(16, 20)]),
    ).toBeCloseTo(87, 5);
  });

  it("handles a mixed-format assignment (MC + short answer + essay)", () => {
    // 27/30 + 18/25 + 39/45 = 84/100
    expect(
      percentFromSections([cat(27, 30), cat(18, 25), cat(39, 45)]),
    ).toBeCloseTo(84, 5);
  });

  it("handles a non-100-point rubric (out of 60)", () => {
    expect(percentFromSections([cat(27, 30), cat(21, 30)])).toBeCloseTo(80, 5);
  });

  it("handles a 4-point-scale rubric", () => {
    expect(percentFromSections([cat(3, 4), cat(4, 4), cat(3, 4)])).toBeCloseTo(
      (10 / 12) * 100,
      5,
    );
  });

  it("returns null when total possible is zero", () => {
    expect(percentFromSections([cat(0, 0)])).toBeNull();
  });
});

describe("point totals", () => {
  it("sums possible and earned", () => {
    const cats = [cat(18.5, 20), cat(22, 25)];
    expect(totalPointsPossible(cats)).toBe(45);
    expect(totalPointsEarned(cats)).toBe(40.5);
  });
});

describe("estimatedRange", () => {
  it("is tighter for backed scoring and wider when inferred", () => {
    const tight = estimatedRange(87, false);
    const wide = estimatedRange(87, true);
    expect(tight.high - tight.low).toBeLessThan(wide.high - wide.low);
    expect(tight.low).toBeLessThanOrEqual(87);
    expect(tight.high).toBeGreaterThanOrEqual(87);
  });
  it("clamps to 0-100", () => {
    expect(estimatedRange(2, true).low).toBe(0);
    expect(estimatedRange(99, true).high).toBe(100);
  });
});

describe("clampPercent", () => {
  it("handles NaN / Infinity", () => {
    expect(clampPercent(NaN)).toBe(0);
    expect(clampPercent(Infinity)).toBe(0);
  });
});
