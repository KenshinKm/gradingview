import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeHero } from "@/components/grade-hero";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { stripeConfigured } from "@/lib/env";
import type { AssignmentWithAttempts, GradingAttempt } from "@/lib/types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function latestComplete(attempts: GradingAttempt[]): GradingAttempt | null {
  return (
    [...attempts]
      .filter((a) => a.status === "complete")
      .sort((a, b) => b.draft_number - a.draft_number)[0] ?? null
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const supabase = await createSupabaseServerClient();
  const [{ data: assignments }, entitlement] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, grading_attempts(*)")
      .order("created_at", { ascending: false })
      .returns<AssignmentWithAttempts[]>(),
    getEntitlement(user.id),
  ]);

  const plan = PLANS[entitlement.plan];
  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />

      <main className="container-page flex-1 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Your assignments
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {plan.name} plan ·{" "}
              {entitlement.devBypass
                ? "development mode — unlimited grades"
                : entitlement.limitScope === "lifetime"
                  ? `${entitlement.remaining} of ${entitlement.limit} free lifetime grade${entitlement.limit === 1 ? "" : "s"} remaining`
                  : `${entitlement.remaining} of ${entitlement.limit} grades left this billing period`}
            </p>
          </div>
          <div className="flex gap-2">
            {entitlement.plan === "free" && !entitlement.devBypass && (
              <Link href="/pricing" className="btn-secondary">
                Upgrade
              </Link>
            )}
            <Link href="/grade" className="btn-primary">
              Grade New Work
            </Link>
          </div>
        </div>

        <div className="card mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-medium text-ink">Current plan: {plan.name}</p>
            <p className="text-ink-muted">
              {entitlement.limitScope === "billing_period" && entitlement.periodEnd
                ? `Grades remaining this period: ${remaining} · resets ${new Date(
                    entitlement.periodEnd,
                  ).toLocaleDateString()}`
                : entitlement.devBypass
                  ? "Development mode — unlimited grades, no billing"
                  : `Free lifetime grades remaining: ${remaining}`}
            </p>
          </div>
          <div className="flex gap-2">
            {entitlement.plan === "free" ? (
              <Link href="/pricing" className="btn-primary">
                See plans
              </Link>
            ) : stripeConfigured() ? (
              <ManageBillingButton />
            ) : null}
          </div>
        </div>

        {!assignments || assignments.length === 0 ? (
          <div className="card mt-8 text-center">
            <h2 className="text-lg font-semibold text-ink">No assignments yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Add your grading materials and your completed work to get an
              estimated grade, a breakdown, and prioritized fixes.
            </p>
            <Link href="/grade" className="btn-primary mt-4">
              Grade your first submission
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {assignments.map((a) => {
              const latest = latestComplete(a.grading_attempts);
              const drafts = [...a.grading_attempts]
                .filter((x) => x.status === "complete")
                .sort((x, y) => x.draft_number - y.draft_number);
              return (
                <Link
                  key={a.id}
                  href={`/dashboard/assignments/${a.id}`}
                  className="card transition hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-ink">{a.title}</h3>
                      <p className="text-sm text-ink-muted">
                        {a.course || "No course"} ·{" "}
                        {a.citation_style !== "not_specified"
                          ? a.citation_style.toUpperCase()
                          : "Citation not specified"}{" "}
                        · {new Date(a.created_at).toLocaleDateString()}
                      </p>
                      {drafts.length > 0 && (
                        <p className="mt-2 text-sm text-ink-soft">
                          <span className="text-ink-muted">Est. </span>
                          {drafts
                            .map(
                              (d) =>
                                `Draft ${d.draft_number} — ~${Math.round(d.score ?? 0)}% ${d.letter_grade ?? ""}`,
                            )
                            .join("  →  ")}
                        </p>
                      )}
                    </div>
                    {latest && (
                      <div className="shrink-0">
                        <GradeHero
                          letter={latest.letter_grade ?? "—"}
                          score={latest.score ?? 0}
                          low={latest.estimated_range_low ?? 0}
                          high={latest.estimated_range_high ?? 0}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
