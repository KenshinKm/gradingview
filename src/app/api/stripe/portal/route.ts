import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { SITE_URL, stripeConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Billing is not configured." },
        { status: 503 },
      );
    }
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: sub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe first." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${SITE_URL.replace(/\/$/, "")}/dashboard`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("stripe/portal error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not open the billing portal.",
      },
      { status: 500 },
    );
  }
}
