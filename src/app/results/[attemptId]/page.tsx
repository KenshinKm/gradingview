import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeHero } from "@/components/grade-hero";
import { DraftProgression } from "@/components/draft-progression";
import { ScoringBasisBadge } from "@/components/scoring-basis-badge";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { DISCLAIMER } from "@/lib/grading/schema";
import { totalPointsEarned, totalPointsPossible, round } from "@/lib/grading/grade-math";
import type { GradingAttempt, Assignment } from "@/lib/types";

export const metadata = { title: "Your estimated grade" };
export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?redirect=/results/${attemptId}`);

  const supabase = await createSupabaseServerClient();
  const { data: attempt } = await supabase
    .from("grading_attempts")
    .select("*, assignments(*)")
    .eq("id", attemptId)
    .single<GradingAttempt & { assignments: Assignment }>();

  if (!attempt) notFound();
  const assignment = attempt.assignments;

  if (attempt.status === "failed") {
    return (
      <Shell userId={user.id}>
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-ink">Grading didn&apos;t finish</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {attempt.error_message ||
              "Something went wrong while grading this submission."}{" "}
            Your grading credit was not used.
          </p>
          <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary mt-4">
            Try again
          </Link>
        </div>
      </Shell>
    );
  }

  if (attempt.status !== "complete" || !attempt.result) {
    return (
      <Shell userId={user.id}>
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-ink">Still grading…</h1>
          <p className="mt-2 text-sm text-ink-muted">Refresh in a few seconds.</p>
        </div>
      </Shell>
    );
  }

  const r = attempt.result;

  const { data: siblings } = await supabase
    .from("grading_attempts")
    .select("id, draft_number, score, letter_grade, status")
    .eq("assignment_id", assignment.id)
    .eq("status", "complete")
    .order("draft_number", { ascending: true })
    .returns<Pick<GradingAttempt, "id" | "draft_number" | "score" | "letter_grade" | "status">[]>();

  const grammar = r.grammar_or_citation_issues ?? [];
  const written = r.written_response_feedback ?? [];
  const pointsPossible = totalPointsPossible(r.sections);
  const pointsEarned = totalPointsEarned(r.sections);

  return (
    <Shell userId={user.id}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {assignment.title}
          </h1>
          <p className="text-sm text-ink-muted">
            Draft {attempt.draft_number}
            {assignment.course ? ` · ${assignment.course}` : ""} ·{" "}
            {new Date(attempt.created_at).toLocaleDateString()}
          </p>
        </div>
        <Link href="/dashboard" className="btn-ghost">
          ← Dashboard
        </Link>
      </div>

      {/* GRADE HERO */}
      <div className="card">
        <div className="rounded-xl bg-surface-subtle py-4">
          <GradeHero
            letter={r.letter_grade}
            score={r.score}
            low={r.estimated_range_low}
            high={r.estimated_range_high}
          />
        </div>

        {/* Strong estimate disclaimer — directly under the grade */}
        <p className="mt-4 text-center text-sm leading-relaxed text-ink-soft">
          {r.disclaimer || DISCLAIMER}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <ScoringBasisBadge basis={r.scoring_basis} />
          {pointsPossible > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-ink-soft">
              {round(pointsEarned, 1)} / {round(pointsPossible, 1)} points
            </span>
          )}
        </div>

        {r.grading_basis_note && (
          <p className="mt-3 text-center text-xs text-ink-muted">
            {r.grading_basis_note}
          </p>
        )}

        {r.inferred_rubric && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Some or all of this scoring was AI-inferred because no complete rubric
            or answer key was provided. Treat these numbers as a loose guide.
          </p>
        )}
      </div>

      {siblings && siblings.length > 1 && (
        <div className="mt-6">
          <DraftProgression
            drafts={siblings}
            currentId={attempt.id}
            assignmentId={assignment.id}
          />
        </div>
      )}

      {/* THINGS TO FIX */}
      <section className="mt-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
          Things to fix
        </h2>
        <div className="mt-3 space-y-3">
          {r.things_to_fix.map((t) => (
            <div key={t.priority} className="card">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700">
                  {t.priority}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{t.title}</h3>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    {t.location}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{t.explanation}</p>
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className="font-medium text-ink">Do this: </span>
                    {t.suggestion}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION / RUBRIC BREAKDOWN */}
      {r.sections.length > 0 && (
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
              {r.scoring_basis === "rubric" ? "Rubric breakdown" : "Breakdown"}
            </h2>
            <span className="text-sm text-ink-muted">
              {round(pointsEarned, 1)} / {round(pointsPossible, 1)} pts
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {r.sections.map((c, i) => {
              const pct =
                c.points_possible > 0
                  ? (c.points_earned / c.points_possible) * 100
                  : 0;
              return (
                <div key={i} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">{c.name}</h3>
                    <div className="flex items-center gap-2">
                      <ScoringBasisBadge basis={c.scoring_basis} small />
                      <span className="shrink-0 text-sm font-semibold text-ink-soft">
                        {round(c.points_earned, 1)} / {round(c.points_possible, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{c.feedback}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* WRITTEN RESPONSE FEEDBACK */}
      {written.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
            Written response feedback
          </h2>
          <div className="mt-3 space-y-3">
            {written.map((w, i) => (
              <div key={i} className="card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink">{w.label}</h3>
                  <span className="text-sm font-semibold text-ink-soft">
                    {round(w.points_earned, 1)} / {round(w.points_possible, 1)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  <span className="font-medium text-ink">Why points were lost: </span>
                  {w.why_points_lost}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  <span className="font-medium text-ink">How to improve: </span>
                  {w.how_to_improve}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STRENGTHS */}
      {r.strengths.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
            Strengths
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {r.strengths.map((s, i) => (
              <div key={i} className="card">
                <h3 className="font-semibold text-emerald-700">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GRAMMAR / CITATION */}
      {grammar.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
            Grammar / citation issues
          </h2>
          <div className="mt-3 space-y-2">
            {grammar.map((g, i) => (
              <div key={i} className="card flex flex-wrap gap-x-3 gap-y-1">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-soft">
                  {g.type}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {g.location}
                </span>
                <p className="w-full text-sm text-ink-soft">{g.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OVERALL */}
      <section className="mt-8">
        <h2 className="text-lg font-bold uppercase tracking-wide text-ink">
          Overall feedback
        </h2>
        <div className="card mt-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {r.overall_feedback}
          </p>
        </div>
      </section>

      {/* RE-GRADE CTA */}
      <section className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6">
        <h2 className="text-lg font-bold text-ink">Ready to check your revision?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Fix the issues above, upload your revised work, and see if your estimated
          grade improves.
        </p>
        <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary mt-4">
          Re-Grade My Work
        </Link>
      </section>

      {/* ACTIONS */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/grade?assignment=${assignment.id}`} className="btn-secondary">
          Re-Grade My Work
        </Link>
        <Link href="/grade" className="btn-secondary">
          Grade Something Else
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            View Your Work
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {attempt.work_text || "(Your work was provided as images.)"}
          </p>
        </details>
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            View Grading Materials
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {assignment.grading_materials_text ||
              "(Grading materials were provided as images.)"}
          </p>
        </details>
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">{DISCLAIMER}</p>
    </Shell>
  );
}

async function Shell({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) {
  const entitlement = await getEntitlement(userId);
  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
