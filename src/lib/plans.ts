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
    gradeLimit: 1,
    limitScope: "lifetime",
    features: [
      "1 lifetime full grade",
      "Complete grading result",
      "Full rubric / breakdown",
      "Fixes, strengths, and feedback",
      "No credit card required",
    ],
  },
  student: {
    id: "student",
    name: "Student",
    priceLabel: "$19.99",
    priceCents: 1999,
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
    priceLabel: "$49.99",
    priceCents: 4999,
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
