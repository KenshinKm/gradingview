import { PLANS, type PlanId } from "@/lib/plans";

export type BlockReason =
  | "free_grade_used"
  | "period_limit_reached"
  | "subscription_inactive"
  | "billing_not_configured";

export interface EntitlementDecision {
  plan: PlanId;
  limitScope: "lifetime" | "billing_period";
  limit: number;
  used: number;
  remaining: number;
  canGrade: boolean;
  blockReason: BlockReason | null;
  devBypass: boolean;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface EntitlementInputs {
  devBypass: boolean;
  billingReady: boolean;
  /** Subscription plan on file (may be "free"). */
  subPlan: PlanId;
  /** Whether the subscription is in an active-ish status. */
  subActive: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  /** Count of lifetime free_grade usage events (+ profile flag fallback). */
  freeUsed: number;
  /** Count of paid_grade usage events within the current billing period. */
  paidUsedThisPeriod: number;
}

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
export function isActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(status ?? "");
}

/**
 * Pure entitlement decision. No I/O — unit tested directly.
 */
export function computeEntitlement(i: EntitlementInputs): EntitlementDecision {
  const paidActive = i.subActive && i.subPlan !== "free";

  // ---- DEV BYPASS (only ever passed as true when NODE_ENV !== production) ----
  if (i.devBypass) {
    return {
      plan: paidActive ? i.subPlan : "free",
      limitScope: "billing_period",
      limit: 9999,
      used: 0,
      remaining: 9999,
      canGrade: true,
      blockReason: null,
      devBypass: true,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
    };
  }

  // ---- fail closed if billing config missing (production) ----
  if (!i.billingReady) {
    return {
      plan: "free",
      limitScope: "lifetime",
      limit: PLANS.free.gradeLimit,
      used: 0,
      remaining: 0,
      canGrade: false,
      blockReason: "billing_not_configured",
      devBypass: false,
      periodStart: null,
      periodEnd: null,
    };
  }

  // ---- active paid plan: per billing period ----
  if (paidActive && i.periodStart && i.periodEnd) {
    const limit = PLANS[i.subPlan].gradeLimit;
    const used = Math.max(0, i.paidUsedThisPeriod);
    const remaining = Math.max(0, limit - used);
    return {
      plan: i.subPlan,
      limitScope: "billing_period",
      limit,
      used,
      remaining,
      canGrade: remaining > 0,
      blockReason: remaining > 0 ? null : "period_limit_reached",
      devBypass: false,
      periodStart: i.periodStart,
      periodEnd: i.periodEnd,
    };
  }

  // ---- free plan: one lifetime grade ----
  const limit = PLANS.free.gradeLimit;
  const used = Math.max(0, i.freeUsed);
  const remaining = Math.max(0, limit - used);
  return {
    plan: "free",
    limitScope: "lifetime",
    limit,
    used,
    remaining,
    canGrade: remaining > 0,
    blockReason:
      remaining > 0
        ? null
        : i.subPlan !== "free"
          ? "subscription_inactive"
          : "free_grade_used",
    devBypass: false,
    periodStart: null,
    periodEnd: null,
  };
}
