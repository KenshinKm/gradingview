export type PlanId = "free" | "student" | "student_plus";

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  /** Grading attempts allowed. Free = lifetime; paid = per billing period. */
  gradeLimit: number;
  limitScope: "lifetime" | "billing_period";
  features: string[];
}

/**
 * TEMPORARY testing allowance. While true, every account gets
 * TEMP_FREE_GRADE_LIMIT free lifetime grades instead of the normal
 * BASE_FREE_GRADE_LIMIT, and the UI shows a "Temporary" badge next to the
 * number. To end the promo, set this to false and redeploy: the limit drops
 * back to the base value everywhere (pricing, dashboard, paywalls, the
 * per-network cap, and entitlement checks all derive from it).
 */
export const FREE_GRADES_TEMPORARY = true;
export const BASE_FREE_GRADE_LIMIT = 3;
export const TEMP_FREE_GRADE_LIMIT = 10;
const FREE_GRADE_LIMIT = FREE_GRADES_TEMPORARY
  ? TEMP_FREE_GRADE_LIMIT
  : BASE_FREE_GRADE_LIMIT;

/**
 * Single source of truth for plan limits. Change a `gradeLimit` here and it
 * propagates to the pricing UI, dashboard usage meter, entitlement logic,
 * paywalls, and tests — nothing else hardcodes these numbers.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    priceCents: 0,
    gradeLimit: FREE_GRADE_LIMIT,
    limitScope: "lifetime",
    features: [
      `${FREE_GRADE_LIMIT} lifetime full grades`,
      "Complete grading result",
      "Full rubric / breakdown",
      "Fixes, strengths, and feedback",
      "No credit card required",
    ],
  },
  student: {
    id: "student",
    name: "Student",
    priceLabel: "$9.99",
    priceCents: 999,
    gradeLimit: 15,
    limitScope: "billing_period",
    features: [
      "15 successful grading attempts per billing period",
      "Initial grades and re-grades both count as attempts",
      "Full grading history",
      "Cancel anytime",
    ],
  },
  student_plus: {
    id: "student_plus",
    name: "Student Plus",
    priceLabel: "$19.99",
    priceCents: 1999,
    gradeLimit: 30,
    limitScope: "billing_period",
    features: [
      "30 successful grading attempts per billing period",
      "Initial grades and re-grades both count as attempts",
      "Full grading history",
      "Best for students who grade / revise frequently",
      "Cancel anytime",
    ],
  },
};

export function planFromPriceId(priceId: string): PlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_STUDENT_PRICE_ID) return "student";
  if (priceId === process.env.STRIPE_STUDENT_PLUS_PRICE_ID) return "student_plus";
  return null;
}

export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === "student") return process.env.STRIPE_STUDENT_PRICE_ID || null;
  if (plan === "student_plus")
    return process.env.STRIPE_STUDENT_PLUS_PRICE_ID || null;
  return null;
}
