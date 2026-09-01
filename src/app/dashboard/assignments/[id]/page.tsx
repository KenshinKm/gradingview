import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeHero } from "@/components/grade-hero";
import { DraftProgression } from "@/components/draft-progression";
import { DeleteAssignmentButton } from "@/components/delete-assignment-button";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { round } from "@/lib/grading/grade-math";
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

  const complete = [...assignment.grading_attempts]
    .filter((a) => a.status === "complete")
    .sort((a, b) => a.draft_number - b.draft_number);
  const latest = complete[complete.length - 1] as GradingAttempt | undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/dashboard" className="btn-ghost mb-4 -ml-2">
            ← Dashboard
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">
                {assignment.title}
              </h1>
              <p className="text-sm text-ink-muted">
                {assignment.course || "No course"} ·{" "}
                {assignment.citation_style !== "not_specified"
                  ? assignment.citation_style.toUpperCase()
                  : "Citation not specified"}{" "}
                · Created {new Date(assignment.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary">
                Re-Grade
              </Link>
              <DeleteAssignmentButton assignmentId={assignment.id} />
            </div>
          </div>

          {latest ? (
            <>
              <div className="card mt-6">
                <div className="rounded-xl bg-surface-subtle py-4">
                  <GradeHero
                    letter={latest.letter_grade ?? "—"}
                    score={latest.score ?? 0}
                    low={latest.estimated_range_low ?? 0}
                    high={latest.estimated_range_high ?? 0}
                  />
                </div>
                <div className="mt-4 text-center">
                  <Link href={`/results/${latest.id}`} className="btn-secondary">
                    Open latest result
                  </Link>
                </div>
              </div>

              {complete.length > 1 && (
                <div className="mt-6">
                  <DraftProgression
                    drafts={complete}
                    currentId={latest.id}
                    assignmentId={assignment.id}
                  />
                </div>
              )}

              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                All drafts
              </h2>
              <div className="mt-3 space-y-2">
                {complete
                  .slice()
                  .reverse()
                  .map((d) => (
                    <Link
                      key={d.id}
                      href={`/results/${d.id}`}
                      className="card flex items-center justify-between transition hover:border-brand-200"
                    >
                      <span className="text-sm font-medium text-ink">
                        Draft {d.draft_number}
                      </span>
                      <span className="text-sm text-ink-soft">
                        est. ~{round(d.score ?? 0)}% · {d.letter_grade} ·{" "}
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
              </div>
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
