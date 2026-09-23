/**
 * Edge-safe helpers (no Node imports) deciding whether TikTok tracking may run.
 * Used by the root layout, middleware, and API routes.
 */

// EEA + UK + Switzerland: consent is required before ad pixels fire, and the
// site has no consent banner, so tracking is simply off for these visitors.
const RESTRICTED_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES",
  "SE", "IS", "LI", "NO", "GB", "CH",
]);

/**
 * False when the visitor sends the Global Privacy Control signal or appears to
 * be in a region that requires opt-in consent. `x-vercel-ip-country` is set by
 * Vercel; when absent (local dev) tracking is allowed.
 */
export function trackingAllowed(headers: Headers): boolean {
  if (headers.get("sec-gpc") === "1") return false;
  const country = (headers.get("x-vercel-ip-country") || "").toUpperCase();
  return !RESTRICTED_COUNTRIES.has(country);
}

/** TikTok pixel ids are short alphanumeric codes; reject anything else before it reaches inline script. */
export function isValidPixelId(id: string | undefined | null): id is string {
  return typeof id === "string" && /^[A-Z0-9]{10,32}$/.test(id);
}

/** Validates a `ttclid` click id from a landing URL before storing it in a cookie. */
export function sanitizeClickId(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^[A-Za-z0-9._~-]{8,200}$/.test(value) ? value : null;
}
