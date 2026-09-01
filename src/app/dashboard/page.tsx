import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { gradeColor } from "@/components/grade-hero";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { ManageBillingButton } from "@/components/manage-billing-button";
import { UsageMeter } from "@/components/usage-meter";
import { stripeConfigured } from "@/lib/env";
import { round } from "@/lib/grading/grade-math";
import type { AssignmentWithAttempts } from "@/lib/types";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface GradeRow {
  attemptId: string;
  assignmentId: string;
  title: string;
  course: string | null;
  letter: string;
  score: number;
  date: string;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const supabase = await createSupabaseServerClient();
  const [{ data: assignments }, entitlement] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, grading_attempts(*)")
      .returns<AssignmentWithAttempts[]>(),
    getEntitlement(user.id),
  ]);

  const plan = PLANS[entitlement.plan];
  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  // Flat "recent grades" — every completed grade is its own history item.
  const grades: GradeRow[] = (assignments ?? [])
    .flatMap((a) =>
      a.grading_attempts
        .filter((at) => at.status === "complete")
        .map((at) => ({
          attemptId: at.id,
          assignmentId: a.id,
          title: a.title,
          course: a.course,
          letter: at.letter_grade ?? "—",
          score: at.score ?? 0,
          date: at.created_at,
        })),
    )
    .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />

      <main className="container-page flex-1 py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">Dashboard</h1>
            <p className="mt-1 text-sm text-ink-muted">{plan.name} plan</p>
          </div>
          <div className="flex gap-2">
            {entitlement.plan === "free" &&
              !entitlement.devBypass &&
              stripeConfigured() && (
                <Link href="/pricing" className="btn-secondary">
                  Upgrade
                </Link>
              )}
            <Link href="/grade" className="btn-primary">
              Grade New Work
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <UsageMeter entitlement={entitlement} />
          {entitlement.plan !== "free" && stripeConfigured() && (
            <div className="mt-3">
              <ManageBillingButton />
            </div>
          )}
        </div>

        <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Recent grades
        </h2>

        {grades.length === 0 ? (
          <div className="card mt-3 text-center">
            <h3 className="text-base font-semibold text-ink">No grades yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Add your grading materials and your completed work to get an
              estimated grade, a breakdown, and prioritized fixes.
            </p>
            <Link href="/grade" className="btn-primary mt-4">
              Grade your first submission
            </Link>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {grades.map((g) => (
              <Link
                key={g.attemptId}
                href={`/results/${g.attemptId}`}
                className="card flex items-center justify-between gap-4 p-4 transition hover:border-brand-200"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {g.title}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {g.course ? `${g.course} · ` : ""}
                    {new Date(g.date).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold ${gradeColor(g.score)}`}
                >
                  {g.letter} · ~{round(g.score)}%
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
