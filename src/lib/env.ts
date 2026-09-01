/**
 * Centralized environment access.
 * Server-only secrets must never be imported into client components.
 */

export const IS_PROD = process.env.NODE_ENV === "production";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

/**
 * BILLING_MODE:
 *   "dev"  -> local testing without Stripe. Forced off in production.
 *   "live" -> real Stripe entitlement checks.
 */
export const BILLING_MODE: "dev" | "live" =
  !IS_PROD && process.env.BILLING_MODE === "dev" ? "dev" : "live";

export const DEV_BILLING_BYPASS = BILLING_MODE === "dev";

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  bucket: process.env.SUPABASE_STORAGE_BUCKET || "gradingview-uploads",
};

export const llmEnv = {
  provider: (process.env.LLM_PROVIDER || "anthropic") as "anthropic" | "openai",
  model: process.env.LLM_MODEL || "claude-sonnet-4-20250514",
  visionModel:
    process.env.LLM_VISION_MODEL ||
    process.env.LLM_MODEL ||
    "claude-sonnet-4-20250514",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
};

export const stripeEnv = {
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  studentPriceId: process.env.STRIPE_STUDENT_PRICE_ID || "",
  studentPlusPriceId: process.env.STRIPE_STUDENT_PLUS_PRICE_ID || "",
};

export const limits = {
  maxUploadBytes: (Number(process.env.MAX_UPLOAD_MB) || 15) * 1024 * 1024,
  maxPdfPages: Number(process.env.MAX_PDF_PAGES) || 40,
};

/**
 * Returns true when Stripe is fully configured for live billing.
 * In production this MUST be true or entitlement checks fail closed.
 */
export function stripeConfigured(): boolean {
  return Boolean(
    stripeEnv.secretKey &&
      stripeEnv.webhookSecret &&
      stripeEnv.studentPriceId &&
      stripeEnv.studentPlusPriceId,
  );
}

export function assertProdBillingConfigured() {
  if (IS_PROD && !stripeConfigured()) {
    throw new Error(
      "Billing is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, " +
        "STRIPE_STUDENT_PRICE_ID and STRIPE_STUDENT_PLUS_PRICE_ID.",
    );
  }
}
