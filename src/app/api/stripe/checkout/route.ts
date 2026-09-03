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
  const out: Record<string, unknown> = {
    ok: true,
    build: "diag2",
    stripeConfigured: stripeConfigured(),
    siteUrl: SITE_URL,
  };

  // 1. raw fetch to a neutral host
  try {
    const r = await fetch("https://example.com", { cache: "no-store" });
    out.rawExampleCom = `${r.status}`;
  } catch (e) {
    out.rawExampleCom = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // 2. raw fetch to Stripe (bypass the SDK)
  try {
    const t0 = Date.now();
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
      cache: "no-store",
    });
    out.rawStripe = `${r.status} in ${Date.now() - t0}ms`;
  } catch (e) {
    out.rawStripe = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  // 3. via SDK
  try {
    await getStripe().balance.retrieve();
    out.sdkStripe = "ok";
  } catch (e) {
    out.sdkStripe = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return NextResponse.json(out);
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
