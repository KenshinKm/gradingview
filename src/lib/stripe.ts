import "server-only";
import Stripe from "stripe";
import { stripeEnv } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeEnv.secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!cached) {
    cached = new Stripe(stripeEnv.secretKey, {
      // Use fetch (works reliably on Vercel serverless — the default Node
      // http agent can fail to connect there with keep-alive sockets).
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
      timeout: 20_000,
    });
  }
  return cached;
}
