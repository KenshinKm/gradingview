import { describe, it, expect } from "vitest";
import { computeEntitlement, type EntitlementInputs } from "./entitlements-core";
import { PLANS, FREE_GRADES_TEMPORARY, BASE_FREE_GRADE_LIMIT, TEMP_FREE_GRADE_LIMIT } from "./plans";

const FREE = PLANS.free.gradeLimit;

const base: EntitlementInputs = {
  devBypass: false,
  billingReady: true,
  subPlan: "free",
  subActive: false,
  periodStart: null,
  periodEnd: null,
  freeUsed: 0,
  paidUsedThisPeriod: 0,
};

describe("plan limits come from PLANS (single source of truth)", () => {
  it("Student = 15, Student Plus = 30, Free follows the temporary switch", () => {
    expect(PLANS.free.gradeLimit).toBe(
      FREE_GRADES_TEMPORARY ? TEMP_FREE_GRADE_LIMIT : BASE_FREE_GRADE_LIMIT,
    );
    expect(TEMP_FREE_GRADE_LIMIT).toBe(10);
    expect(BASE_FREE_GRADE_LIMIT).toBe(3);
    expect(PLANS.student.gradeLimit).toBe(15);
    expect(PLANS.student_plus.gradeLimit).toBe(30);
  });
});

describe("free lifetime credit", () => {
  it("allows the first free grade", () => {
    const d = computeEntitlement({ ...base, freeUsed: 0 });
    expect(d.plan).toBe("free");
    expect(d.limitScope).toBe("lifetime");
    expect(d.canGrade).toBe(true);
    expect(d.used).toBe(0);
    expect(d.remaining).toBe(FREE);
  });

  it("keeps allowing grades until the last free one is used", () => {
    expect(computeEntitlement({ ...base, freeUsed: 1 }).remaining).toBe(FREE - 1);
    expect(computeEntitlement({ ...base, freeUsed: FREE - 1 }).canGrade).toBe(true);
    expect(computeEntitlement({ ...base, freeUsed: FREE - 1 }).remaining).toBe(1);
  });

  it("someone who already used the old 3 free grades still has the rest", () => {
    // Only meaningful while the temporary allowance is on.
    if (!FREE_GRADES_TEMPORARY) return;
    const d = computeEntitlement({ ...base, freeUsed: BASE_FREE_GRADE_LIMIT });
    expect(d.canGrade).toBe(true);
    expect(d.remaining).toBe(TEMP_FREE_GRADE_LIMIT - BASE_FREE_GRADE_LIMIT);
  });

  it("blocks after all free grades are used", () => {
    const d = computeEntitlement({ ...base, freeUsed: FREE });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("free_grade_used");
    expect(d.used).toBe(FREE);
    expect(d.remaining).toBe(0);
  });

  it("never goes negative", () => {
    const d = computeEntitlement({ ...base, freeUsed: FREE + 5 });
    expect(d.remaining).toBe(0);
  });
});

describe("paid plans within billing period", () => {
  const paid: EntitlementInputs = {
    ...base,
    subPlan: "student",
    subActive: true,
    periodStart: "2026-09-17T00:00:00Z",
    periodEnd: "2026-10-17T00:00:00Z",
  };

  it("gives the Student allowance of 15", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 3 });
    expect(d.plan).toBe("student");
    expect(d.limit).toBe(15);
    expect(d.used).toBe(3);
    expect(d.remaining).toBe(12);
    expect(d.canGrade).toBe(true);
  });

  it("gives Student Plus 30", () => {
    const d = computeEntitlement({
      ...paid,
      subPlan: "student_plus",
      paidUsedThisPeriod: 29,
    });
    expect(d.limit).toBe(30);
    expect(d.remaining).toBe(1);
    expect(d.canGrade).toBe(true);
  });

  it("blocks when the period limit is reached", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 15 });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("period_limit_reached");
    expect(d.remaining).toBe(0);
  });

  it("blocks Student Plus at exactly 30 used", () => {
    const d = computeEntitlement({
      ...paid,
      subPlan: "student_plus",
      paidUsedThisPeriod: 30,
    });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("period_limit_reached");
  });

  it("uses the Stripe billing period, not the calendar month", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 0 });
    expect(d.limitScope).toBe("billing_period");
    expect(d.periodStart).toBe("2026-09-17T00:00:00Z");
    expect(d.periodEnd).toBe("2026-10-17T00:00:00Z");
  });
});

describe("inactive / canceled subscription", () => {
  it("falls back to free tier and blocks if free is spent", () => {
    const d = computeEntitlement({
      ...base,
      subPlan: "student",
      subActive: false,
      freeUsed: FREE,
    });
    expect(d.plan).toBe("free");
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("subscription_inactive");
  });
});

describe("Stripe not configured yet (launch without billing)", () => {
  it("the free lifetime grades still work", () => {
    const d = computeEntitlement({ ...base, billingReady: false, freeUsed: 0 });
    expect(d.plan).toBe("free");
    expect(d.canGrade).toBe(true);
    expect(d.remaining).toBe(FREE);
  });

  it("blocks once all free grades are spent — paid plans unreachable", () => {
    const d = computeEntitlement({ ...base, billingReady: false, freeUsed: FREE });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("billing_not_configured");
  });

  it("ignores an 'active' paid sub that can't be verified without Stripe", () => {
    const d = computeEntitlement({
      ...base,
      billingReady: false,
      subPlan: "student",
      subActive: true,
      periodStart: "2026-09-01T00:00:00Z",
      periodEnd: "2026-10-01T00:00:00Z",
      freeUsed: 0,
    });
    expect(d.plan).toBe("free");
    expect(d.limitScope).toBe("lifetime");
  });
});

describe("dev bypass", () => {
  it("always allows grading and never reports a block", () => {
    const d = computeEntitlement({
      ...base,
      devBypass: true,
      freeUsed: 99,
      billingReady: false,
    });
    expect(d.canGrade).toBe(true);
    expect(d.devBypass).toBe(true);
    expect(d.blockReason).toBeNull();
  });

  it("still reports honest usage numbers for the meter", () => {
    const d = computeEntitlement({ ...base, devBypass: true, freeUsed: FREE });
    expect(d.used).toBe(FREE);
    expect(d.limit).toBe(FREE);
    expect(d.remaining).toBe(0);
    expect(d.canGrade).toBe(true); // not enforced in dev
  });

  it("reflects an active paid plan under dev bypass", () => {
    const d = computeEntitlement({
      ...base,
      devBypass: true,
      subPlan: "student_plus",
      subActive: true,
      periodStart: "2026-09-17T00:00:00Z",
      periodEnd: "2026-10-17T00:00:00Z",
      paidUsedThisPeriod: 7,
    });
    expect(d.plan).toBe("student_plus");
    expect(d.limit).toBe(30);
    expect(d.used).toBe(7);
  });
});
