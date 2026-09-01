import { describe, it, expect } from "vitest";
import { computeEntitlement, type EntitlementInputs } from "./entitlements-core";
import { PLANS } from "./plans";

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
  it("Student = 15, Student Plus = 30, Free = 1", () => {
    expect(PLANS.free.gradeLimit).toBe(1);
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
    expect(d.remaining).toBe(1);
  });

  it("blocks after the free grade is used", () => {
    const d = computeEntitlement({ ...base, freeUsed: 1 });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("free_grade_used");
    expect(d.used).toBe(1);
    expect(d.remaining).toBe(0);
  });

  it("never goes negative", () => {
    const d = computeEntitlement({ ...base, freeUsed: 5 });
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
      freeUsed: 1,
    });
    expect(d.plan).toBe("free");
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("subscription_inactive");
  });
});

describe("production fail-closed", () => {
  it("blocks everything when billing config is missing", () => {
    const d = computeEntitlement({ ...base, billingReady: false, freeUsed: 0 });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("billing_not_configured");
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
    const d = computeEntitlement({ ...base, devBypass: true, freeUsed: 1 });
    expect(d.used).toBe(1);
    expect(d.limit).toBe(1);
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
