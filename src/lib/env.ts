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
  model: process.env.LLM_MODEL || "claude-sonnet-5",
  visionModel:
    process.env.LLM_VISION_MODEL || process.env.LLM_MODEL || "claude-sonnet-5",
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
function realValue(v: string): boolean {
  // Reject empty and the obvious `.env.example` placeholders.
  return Boolean(v) && !/(^|_)xxx$/i.test(v) && !v.endsWith("YOUR-PROJECT");
}

export function stripeConfigured(): boolean {
  return (
    realValue(stripeEnv.secretKey) &&
    realValue(stripeEnv.webhookSecret) &&
    realValue(stripeEnv.studentPriceId) &&
    realValue(stripeEnv.studentPlusPriceId)
  );
}

/**
 * Whether paid plans are available. When false, the free tier still works and
 * paid checkout is disabled — so the app is launchable before Stripe is set up.
 * Identical behavior in dev and prod (dev billing bypass is handled separately).
 */
export function billingReady(): boolean {
  return stripeConfigured();
}
