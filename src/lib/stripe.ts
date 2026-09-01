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
      apiVersion: "2025-02-24.acacia",
    });
  }
  return cached;
}
