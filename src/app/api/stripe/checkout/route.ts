import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { ensureStripeCustomer } from "@/lib/subscriptions";
import { priceIdForPlan, type PlanId } from "@/lib/plans";
import { SITE_URL, stripeConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

// diagnostic
export async function GET() {
  let stripePing: string;
  try {
    const t0 = Date.now();
    await getStripe().balance.retrieve();
    stripePing = `ok ${Date.now() - t0}ms`;
  } catch (e) {
    stripePing = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return NextResponse.json({
    ok: true,
    build: "800c95e+fetchclient",
    stripeConfigured: stripeConfigured(),
    siteUrl: SITE_URL,
    stripePing,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured yet." },
        { status: 503 },
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const { plan } = (await req.json().catch(() => ({}))) as { plan?: PlanId };
    if (plan !== "student" && plan !== "student_plus") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Plan is not available." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(stripe, user.id, user.email);

    const base = SITE_URL.replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id, plan },
      success_url: `${base}/dashboard?checkout=success`,
      cancel_url: `${base}/pricing?checkout=canceled`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg =
      err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
    console.error("stripe/checkout error:", err);
    return new Response(
      JSON.stringify({ error: msg, stack: (err as Error)?.stack ?? null }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }
}
