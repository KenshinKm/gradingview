import { createHash } from "node:crypto";

/**
 * Server helper — imported only from API routes / server modules.
 *
 * Best-effort client IP from proxy headers. On Vercel the real client IP is the
 * first entry in `x-forwarded-for`. Returns null when it can't be determined
 * (e.g. local dev with no proxy) — callers should fail open in that case.
 */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

/**
 * Salt for IP hashing. Not a hard secret — it just stops the stored hashes from
 * being trivially reversed against the IPv4 space. Set IP_HASH_SALT in prod for
 * defense in depth; the fallback keeps local dev deterministic.
 */
const SALT = process.env.IP_HASH_SALT || "gradingview-ip-salt-v1";

/** One-way, salted hash of an IP. Safe to store; not reversible in practice. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex");
}

/** Hashed client IP from a request's headers, or null when undeterminable. */
export function clientIpHash(headers: Headers): string | null {
  const ip = getClientIp(headers);
  return ip ? hashIp(ip) : null;
}
