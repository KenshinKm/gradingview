import { describe, it, expect } from "vitest";
import { computeEntitlement, type EntitlementInputs } from "./entitlements-core";

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

describe("free lifetime credit", () => {
  it("allows the first free grade", () => {
    const d = computeEntitlement({ ...base, freeUsed: 0 });
    expect(d.plan).toBe("free");
    expect(d.canGrade).toBe(true);
    expect(d.remaining).toBe(1);
  });

  it("blocks after the free grade is used", () => {
    const d = computeEntitlement({ ...base, freeUsed: 1 });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("free_grade_used");
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

  it("gives the Student allowance of 10", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 3 });
    expect(d.plan).toBe("student");
    expect(d.limit).toBe(10);
    expect(d.remaining).toBe(7);
    expect(d.canGrade).toBe(true);
  });

  it("gives Student Plus 20", () => {
    const d = computeEntitlement({
      ...paid,
      subPlan: "student_plus",
      paidUsedThisPeriod: 19,
    });
    expect(d.limit).toBe(20);
    expect(d.remaining).toBe(1);
  });

  it("blocks when the period limit is reached", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 10 });
    expect(d.canGrade).toBe(false);
    expect(d.blockReason).toBe("period_limit_reached");
  });

  it("uses the Stripe billing period, not the calendar month", () => {
    const d = computeEntitlement({ ...paid, paidUsedThisPeriod: 0 });
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

  it("reflects an active paid plan under dev bypass", () => {
    const d = computeEntitlement({
      ...base,
      devBypass: true,
      subPlan: "student_plus",
      subActive: true,
    });
    expect(d.plan).toBe("student_plus");
  });
});
