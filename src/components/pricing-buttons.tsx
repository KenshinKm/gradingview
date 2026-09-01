"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { PlanId } from "@/lib/plans";

export function PricingButtons({
  plan,
  signedIn,
  stripeReady,
  featured,
}: {
  plan: PlanId;
  signedIn: boolean;
  stripeReady: boolean;
  featured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (!signedIn) {
      router.push(`/login?mode=signup&redirect=/pricing`);
      return;
    }
    setBusy(true);
    setError(null);
    track("checkout_started", { plan });
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={subscribe}
        disabled={busy || !stripeReady}
        className={featured ? "btn-primary w-full" : "btn-secondary w-full"}
      >
        {!stripeReady
          ? "Coming soon"
          : busy
            ? "Redirecting…"
            : "Subscribe"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
