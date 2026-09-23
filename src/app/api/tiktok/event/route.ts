import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { trackingAllowed } from "@/lib/tiktok-consent";
import { sendTikTokEvent, type TikTokEventName } from "@/lib/tiktok";

export const runtime = "nodejs";
export const maxDuration = 15;

// Browser-originated events only. Purchases are reported server-side from the
// Stripe webhook, so CompletePayment is deliberately not accepted here.
const CLIENT_EVENTS = new Set<TikTokEventName>([
  "CompleteRegistration",
  "InitiateCheckout",
  "ViewContent",
]);

const done = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  if (!trackingAllowed(req.headers)) return done();

  const ip = getClientIp(req.headers);
  if (!rateLimit(`tt:${ip ?? "unknown"}`, 30, 60_000).ok) return done();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return done();
  }

  const event = body.event as TikTokEventName;
  const eventId = body.event_id;
  if (!CLIENT_EVENTS.has(event)) return done();
  if (typeof eventId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(eventId)) return done();

  const value =
    typeof body.value === "number" && body.value >= 0 && body.value <= 1000
      ? body.value
      : undefined;
  const currency =
    typeof body.currency === "string" && /^[A-Z]{3}$/.test(body.currency)
      ? body.currency
      : undefined;
  const contentId =
    typeof body.content_id === "string" && body.content_id.length <= 64
      ? body.content_id
      : undefined;
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v ? v.slice(0, max) : undefined;

  // The session is optional: signups may not have one yet. When present it
  // improves match quality (hashed before it leaves the server).
  const user = await getSessionUser().catch(() => null);

  await sendTikTokEvent({
    event,
    eventId,
    url: str(body.url, 500),
    referrer: str(body.referrer, 500),
    ip,
    userAgent: req.headers.get("user-agent"),
    ttclid: req.cookies.get("ttclid")?.value,
    ttp: req.cookies.get("_ttp")?.value,
    email: user?.email,
    externalId: user?.id,
    value,
    currency,
    contentId,
  });

  return done();
}
