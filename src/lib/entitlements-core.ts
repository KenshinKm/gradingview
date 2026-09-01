import { PLANS, type PlanId } from "@/lib/plans";

export type BlockReason =
  | "free_grade_used"
  | "period_limit_reached"
  | "subscription_inactive"
  | "billing_not_configured";

export interface EntitlementDecision {
  plan: PlanId;
  limitScope: "lifetime" | "billing_period";
  /** Attempts allowed in the current window (from PLANS — the only source). */
  limit: number;
  /** Successful attempts consumed in the current window. */
  used: number;
  /** limit - used, floored at 0. */
  remaining: number;
  /** Server-authoritative: is another grade allowed right now? */
  canGrade: boolean;
  blockReason: BlockReason | null;
  /** True only in local development billing bypass — limits are NOT enforced. */
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
 *
 * Usage numbers (`plan`/`limit`/`used`/`remaining`/`period*`) are always the
 * honest current state so the dashboard meter is accurate. `canGrade` layers
 * the dev bypass and the "Stripe not configured yet" rule on top of that.
 *
 * When Stripe isn't configured (`billingReady === false`), the FREE tier still
 * works — every user gets their 1 lifetime grade — but paid plans are
 * unreachable (there's no checkout / no webhook to activate them). This is
 * "fail closed" for *paid* access without bricking the whole product at launch.
 */
export function computeEntitlement(i: EntitlementInputs): EntitlementDecision {
  // Paid plans require Stripe. Without it, an "active" sub can't be trusted.
  const paidActive = i.billingReady && i.subActive && i.subPlan !== "free";

  // ---- honest current usage window ----
  let plan: PlanId;
  let limitScope: "lifetime" | "billing_period";
  let used: number;
  let periodStart: string | null;
  let periodEnd: string | null;

  if (paidActive) {
    plan = i.subPlan;
    limitScope = "billing_period";
    used = Math.max(0, i.paidUsedThisPeriod);
    periodStart = i.periodStart;
    periodEnd = i.periodEnd;
  } else {
    plan = "free";
    limitScope = "lifetime";
    used = Math.max(0, i.freeUsed);
    periodStart = null;
    periodEnd = null;
  }

  const limit = PLANS[plan].gradeLimit;
  const remaining = Math.max(0, limit - used);

  // ---- can another grade be run? (server-authoritative) ----
  let canGrade: boolean;
  let blockReason: BlockReason | null;

  if (i.devBypass) {
    // Local development only — limits are displayed but not enforced.
    canGrade = true;
    blockReason = null;
  } else if (remaining > 0) {
    canGrade = true;
    blockReason = null;
  } else {
    canGrade = false;
    blockReason =
      plan !== "free"
        ? "period_limit_reached"
        : !i.billingReady
          ? // Free grade spent and no paid plans available yet.
            "billing_not_configured"
          : i.subPlan !== "free"
            ? "subscription_inactive"
            : "free_grade_used";
  }

  return {
    plan,
    limitScope,
    limit,
    used,
    remaining,
    canGrade,
    blockReason,
    devBypass: i.devBypass,
    periodStart,
    periodEnd,
  };
}
