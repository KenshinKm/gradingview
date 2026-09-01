import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeHero } from "@/components/grade-hero";
import { DeleteAssignmentButton } from "@/components/delete-assignment-button";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { round } from "@/lib/grading/grade-math";
import { gradeColor } from "@/components/grade-hero";
import type { AssignmentWithAttempts, GradingAttempt } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/dashboard/assignments/${id}`);

  const supabase = await createSupabaseServerClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("*, grading_attempts(*)")
    .eq("id", id)
    .single<AssignmentWithAttempts>();

  if (!assignment) notFound();

  const entitlement = await getEntitlement(user.id);
  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  // Every completed grade is its own history item — newest first, no drafts.
  const grades = [...assignment.grading_attempts]
    .filter((a) => a.status === "complete")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const latest = grades[0] as GradingAttempt | undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-9">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="btn-ghost mb-4 -ml-2">
            ← Dashboard
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-ink">
                {assignment.title}
              </h1>
              <p className="text-sm text-ink-muted">
                {assignment.course || "No course"} ·{" "}
                {assignment.citation_style !== "not_specified"
                  ? assignment.citation_style.toUpperCase()
                  : "Citation not specified"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary">
                Check My Revision
              </Link>
              <DeleteAssignmentButton assignmentId={assignment.id} />
            </div>
          </div>

          {latest ? (
            <>
              <div className="card mt-6">
                <div className="rounded-xl bg-surface-subtle py-2">
                  <GradeHero
                    letter={latest.letter_grade ?? "—"}
                    score={latest.score ?? 0}
                    low={latest.estimated_range_low ?? 0}
                    high={latest.estimated_range_high ?? 0}
                  />
                </div>
                <div className="mt-4 text-center">
                  <Link href={`/results/${latest.id}`} className="btn-secondary">
                    Open full result
                  </Link>
                </div>
              </div>

              {grades.length > 1 && (
                <>
                  <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Previous grades
                  </h2>
                  <div className="mt-3 space-y-2">
                    {grades.slice(1).map((d) => (
                      <Link
                        key={d.id}
                        href={`/results/${d.id}`}
                        className="card flex items-center justify-between p-4 transition hover:border-brand-200"
                      >
                        <span
                          className={`text-sm font-semibold ${gradeColor(d.score ?? 0)}`}
                        >
                          {d.letter_grade} · ~{round(d.score ?? 0)}%
                        </span>
                        <span className="text-sm text-ink-muted">
                          {new Date(d.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="card mt-6 text-center">
              <p className="text-sm text-ink-muted">
                No completed grades yet for this assignment.
              </p>
              <Link
                href={`/grade?assignment=${assignment.id}`}
                className="btn-primary mt-3"
              >
                Grade this work
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
