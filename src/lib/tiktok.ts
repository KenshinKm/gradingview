import { createHash } from "node:crypto";
import { getClientIp } from "@/lib/client-ip";
import { isValidPixelId, trackingAllowed } from "@/lib/tiktok-consent";

/** Server-side TikTok Events API sender. Node-only (uses crypto); never import from client code. */

const ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

export type TikTokEventName =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "CompletePayment"
  | "ViewContent";

export interface TikTokEventInput {
  event: TikTokEventName;
  /** Shared with the browser pixel call so TikTok deduplicates the pair. */
  eventId: string;
  url?: string | null;
  referrer?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  ttclid?: string | null;
  ttp?: string | null;
  email?: string | null;
  externalId?: string | null;
  value?: number;
  currency?: string;
  contentId?: string | null;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** TikTok matches on SHA-256 of the trimmed, lowercased email. */
export function hashEmail(email: string): string {
  return sha256Hex(email.trim().toLowerCase());
}

export function buildTikTokPayload(
  input: TikTokEventInput,
  opts: { pixelId: string; testEventCode?: string; now?: number },
) {
  const user: Record<string, string> = {};
  if (input.email) user.email = hashEmail(input.email);
  if (input.externalId) user.external_id = sha256Hex(input.externalId);
  if (input.ip) user.ip = input.ip;
  if (input.userAgent) user.user_agent = input.userAgent;
  if (input.ttclid) user.ttclid = input.ttclid;
  if (input.ttp) user.ttp = input.ttp;

  const properties: Record<string, unknown> = {};
  if (typeof input.value === "number") properties.value = input.value;
  if (input.currency) properties.currency = input.currency;
  if (input.contentId) {
    properties.content_type = "product";
    properties.contents = [
      { content_id: input.contentId, content_type: "product", quantity: 1 },
    ];
  }

  const page: Record<string, string> = {};
  if (input.url) page.url = input.url;
  if (input.referrer) page.referrer = input.referrer;

  return {
    event_source: "web",
    event_source_id: opts.pixelId,
    ...(opts.testEventCode ? { test_event_code: opts.testEventCode } : {}),
    data: [
      {
        event: input.event,
        event_time: Math.floor((opts.now ?? Date.now()) / 1000),
        event_id: input.eventId,
        user,
        properties,
        page,
      },
    ],
  };
}

/**
 * Sends one event to the Events API. Never throws and never blocks callers for
 * long: a tracking failure must not affect signups, checkout, or webhooks.
 * No-ops unless the pixel id and access token are both configured.
 */
export async function sendTikTokEvent(input: TikTokEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const token = process.env.TIKTOK_EVENTS_API_TOKEN;
  if (!isValidPixelId(pixelId) || !token) return;

  const payload = buildTikTokPayload(input, {
    pixelId,
    testEventCode: process.env.TIKTOK_TEST_EVENT_CODE || undefined,
  });

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Access-Token": token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
    // TikTok reports many failures as HTTP 200 with a non-zero `code`.
    const body = (await res.json().catch(() => null)) as {
      code?: number;
      message?: string;
    } | null;
    if (!res.ok || (body && body.code !== 0)) {
      console.error("tiktok events api rejected event", {
        event: input.event,
        status: res.status,
        code: body?.code,
        message: body?.message,
      });
    }
  } catch (err) {
    console.error("tiktok events api request failed", {
      event: input.event,
      error: (err as Error).message,
    });
  }
}

/**
 * Attribution data to stash on the Stripe Checkout Session so the webhook
 * (which has no browser context) can report the purchase. Empty when tracking
 * isn't allowed for this visitor, which also tells the webhook to send nothing.
 */
export function tiktokCheckoutMetadata(req: {
  headers: Headers;
  cookies: { get(name: string): { value: string } | undefined };
}): Record<string, string> {
  if (!trackingAllowed(req.headers)) return {};
  const meta: Record<string, string> = { tt_ok: "1" };
  const ttclid = req.cookies.get("ttclid")?.value;
  const ttp = req.cookies.get("_ttp")?.value;
  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent");
  if (ttclid) meta.tt_clid = ttclid.slice(0, 200);
  if (ttp) meta.tt_ttp = ttp.slice(0, 200);
  if (ip) meta.tt_ip = ip;
  if (ua) meta.tt_ua = ua.slice(0, 300);
  return meta;
}
