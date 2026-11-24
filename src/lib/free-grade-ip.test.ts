import { describe, it, expect } from "vitest";
import { PLANS } from "./plans";
import {
  FREE_GRADE_IP_LIMIT,
  isFreeGradeIpBlocked,
} from "./free-grade-ip";

describe("isFreeGradeIpBlocked", () => {
  it("allows when the client IP is unknown, regardless of count", () => {
    expect(
      isFreeGradeIpBlocked({ ipHash: null, usedInWindow: 999 }),
    ).toBe(false);
  });

  it("allows while under the limit", () => {
    expect(
      isFreeGradeIpBlocked({ ipHash: "abc", usedInWindow: FREE_GRADE_IP_LIMIT - 1 }),
    ).toBe(false);
  });

  it("blocks once the count reaches the limit", () => {
    expect(
      isFreeGradeIpBlocked({ ipHash: "abc", usedInWindow: FREE_GRADE_IP_LIMIT }),
    ).toBe(true);
  });

  it("blocks when over the limit", () => {
    expect(
      isFreeGradeIpBlocked({ ipHash: "abc", usedInWindow: FREE_GRADE_IP_LIMIT + 5 }),
    ).toBe(true);
  });

  it("allows a fresh network (zero prior grades)", () => {
    expect(isFreeGradeIpBlocked({ ipHash: "abc", usedInWindow: 0 })).toBe(false);
  });
});

describe("network cap scales with the free allowance", () => {
  it("is 3x one account's free grades, so a shared network isn't locked out", () => {
    expect(FREE_GRADE_IP_LIMIT).toBe(PLANS.free.gradeLimit * 3);
  });
});
