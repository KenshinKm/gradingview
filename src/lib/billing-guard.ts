import "server-only";
import { IS_PROD, stripeConfigured, DEV_BILLING_BYPASS } from "@/lib/env";

/**
 * Fail closed: in production, grading is unavailable unless Stripe billing
 * is fully configured. The dev bypass can never reach this branch because
 * BILLING_MODE=dev is ignored when NODE_ENV === "production".
 */
export function assertBillingReady() {
  if (DEV_BILLING_BYPASS) return;
  if (IS_PROD && !stripeConfigured()) {
    const err = new Error(
      "Billing is not configured. Grading is temporarily unavailable.",
    );
    (err as Error & { code?: string }).code = "billing_not_configured";
    throw err;
  }
}
