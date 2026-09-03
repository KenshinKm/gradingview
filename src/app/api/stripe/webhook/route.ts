import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { stripeEnv } from "@/lib/env";
import {
  syncSubscriptionFromStripe,
  markSubscriptionCanceled,
} from "@/lib/subscriptions";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!stripeEnv.webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", stripeEnv.webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await syncSubscriptionFromStripe(
            sub,
            session.metadata?.user_id || undefined,
          );
          track("subscription_started", { plan: session.metadata?.plan ?? "" });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        await markSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof (invoice as unknown as { subscription?: string }).subscription ===
          "string"
            ? (invoice as unknown as { subscription: string }).subscription
            : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscriptionFromStripe(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Return 500 so Stripe retries.
    return NextResponse.json(
      { error: `Handler error: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
