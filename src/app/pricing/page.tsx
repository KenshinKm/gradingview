import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PricingButtons } from "@/components/pricing-buttons";
import { PaywallBanner } from "@/components/paywall-banner";
import { PLANS } from "@/lib/plans";
import { getSessionUser } from "@/lib/supabase/server";
import { DEV_BILLING_BYPASS, stripeConfigured } from "@/lib/env";

export const metadata = { title: "Pricing" };

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; checkout?: string }>;
}) {
  const { reason } = await searchParams;
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1 py-14">
        {reason && <PaywallBanner reason={reason} />}

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Simple pricing
          </h1>
          <p className="mt-2 text-ink-soft">
            Every successful initial grade or re-grade counts as one grading
            attempt.
          </p>
        </div>

        {DEV_BILLING_BYPASS ? (
          <p className="mx-auto mt-6 max-w-xl rounded-lg bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-300">
            Development mode: billing is bypassed locally.
          </p>
        ) : !stripeConfigured() ? (
          <p className="mx-auto mt-6 max-w-xl rounded-lg border border-line bg-surface-subtle px-4 py-2 text-center text-sm text-ink-soft">
            Paid plans are launching soon. Your free grade is available now.
          </p>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {(["free", "student", "student_plus"] as const).map((id) => {
            const plan = PLANS[id];
            const featured = id === "student";
            return (
              <div
                key={id}
                className={`card flex flex-col ${
                  featured ? "border-brand-300 ring-1 ring-brand-200" : ""
                }`}
              >
                <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-ink">
                    {plan.priceLabel}
                  </span>
                  {plan.priceCents > 0 && (
                    <span className="text-sm text-ink-muted">/month</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {plan.limitScope === "lifetime"
                    ? `${plan.gradeLimit} lifetime full grade`
                    : `${plan.gradeLimit} grading attempts / billing period`}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {id === "free" ? (
                    <Link
                      href={user ? "/grade" : "/login?mode=signup"}
                      className="btn-secondary w-full"
                    >
                      {user ? "Go to grading" : "Start free"}
                    </Link>
                  ) : (
                    <PricingButtons
                      plan={id}
                      signedIn={!!user}
                      stripeReady={stripeConfigured()}
                      featured={featured}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-ink-muted">
          Grading attempts are only counted after a successful result — failed
          processing or server errors never use a credit. Paid usage resets with
          your Stripe billing period, not the calendar month. GradingView provides
          an AI-generated estimate; your instructor&apos;s actual grade may vary.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-ink-muted">
          All purchases are non-refundable. You can cancel anytime to stop
          future charges.
        </p>
      </main>
    </div>
  );
}
