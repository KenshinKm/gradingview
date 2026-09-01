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
      "Complete rubric breakdown",
      "All fixes, strengths & feedback",
      "No credit card required",
    ],
  },
  student: {
    id: "student",
    name: "Student",
    priceLabel: "$19.99",
    priceCents: 1999,
    gradeLimit: 10,
    limitScope: "billing_period",
    features: [
      "10 grading attempts / billing period",
      "Initial grades and re-grades",
      "Full draft progression history",
      "Cancel anytime",
    ],
  },
  student_plus: {
    id: "student_plus",
    name: "Student Plus",
    priceLabel: "$29.99",
    priceCents: 2999,
    gradeLimit: 20,
    limitScope: "billing_period",
    features: [
      "20 grading attempts / billing period",
      "Everything in Student",
      "Best value for revision-heavy work",
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
