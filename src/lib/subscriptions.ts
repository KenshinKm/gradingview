import "server-only";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { planFromPriceId, type PlanId } from "@/lib/plans";

/**
 * Read the current billing period from a Stripe subscription, tolerating
 * both the top-level fields and the per-item fields used by newer API versions.
 */
export function subscriptionPeriod(sub: Stripe.Subscription): {
  start: number;
  end: number;
} {
  const anySub = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const item = sub.items?.data?.[0] as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const now = Math.floor(Date.now() / 1000);
  const start =
    anySub.current_period_start ?? item?.current_period_start ?? now;
  const end =
    anySub.current_period_end ??
    item?.current_period_end ??
    now + 30 * 24 * 3600;
  return { start, end };
}

/** Map a Stripe subscription onto our `subscriptions` + `profiles` rows. */
export async function syncSubscriptionFromStripe(
  sub: Stripe.Subscription,
  userIdHint?: string,
) {
  const admin = createSupabaseAdminClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  let userId = userIdHint || (sub.metadata?.user_id ?? "");
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? "";
  }
  if (!userId) throw new Error("Could not resolve user for subscription");

  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? "";
  const plan: PlanId = planFromPriceId(priceId) ?? "free";
  const active = ["active", "trialing", "past_due"].includes(sub.status);

  const { start, end } = subscriptionPeriod(sub);

  await admin
    .from("subscriptions")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: active ? plan : "free",
      subscription_status: sub.status,
      current_period_start: new Date(start * 1000).toISOString(),
      current_period_end: new Date(end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    .eq("user_id", userId);

  await admin
    .from("profiles")
    .update({ plan: active ? plan : "free" })
    .eq("id", userId);
}

export async function markSubscriptionCanceled(sub: Stripe.Subscription) {
  const admin = createSupabaseAdminClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!data?.user_id) return;

  await admin
    .from("subscriptions")
    .update({ plan: "free", subscription_status: "canceled" })
    .eq("user_id", data.user_id);
  await admin.from("profiles").update({ plan: "free" }).eq("id", data.user_id);
}

/** Ensure the user has a Stripe customer id; create one if missing. */
export async function ensureStripeCustomer(
  stripe: Stripe,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  });

  await admin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);

  return customer.id;
}
