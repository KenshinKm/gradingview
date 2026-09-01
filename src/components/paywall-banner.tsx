"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

const COPY: Record<string, string> = {
  free_grade_used:
    "You've used your free lifetime grade. Subscribe to keep grading and re-grading your drafts.",
  period_limit_reached:
    "You've used all your grading attempts for this billing period. Upgrade or wait for your next period.",
  subscription_inactive:
    "Your subscription isn't active right now. Reactivate to keep grading.",
  billing_not_configured:
    "Grading is temporarily unavailable while billing is being set up.",
  not_entitled: "You need an active plan to grade this essay.",
};

export function PaywallBanner({ reason }: { reason: string }) {
  useEffect(() => {
    track("paywall_viewed", { reason });
  }, [reason]);

  return (
    <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-center">
      <p className="text-sm font-medium text-brand-800">
        {COPY[reason] ?? COPY.not_entitled}
      </p>
    </div>
  );
}
