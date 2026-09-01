import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeHero } from "@/components/grade-hero";
import { ScoringBasisBadge } from "@/components/scoring-basis-badge";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { DISCLAIMER } from "@/lib/grading/schema";
import { totalPointsEarned, totalPointsPossible, round } from "@/lib/grading/grade-math";
import { gradeColors } from "@/lib/grade-colors";
import type { GradingAttempt, Assignment } from "@/lib/types";

export const metadata = { title: "Your estimated grade" };
export const dynamic = "force-dynamic";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </h2>
  );
}

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
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {attempt.error_message ||
              "Something went wrong while grading this submission."}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
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
  const grammar = (r.grammar_or_citation_issues ?? []).slice(0, 4);
  const written = (r.written_response_feedback ?? []).slice(0, 4);
  const thingsToFix = [...r.things_to_fix]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);
  const strengths = (r.strengths ?? []).slice(0, 3);
  const pointsPossible = totalPointsPossible(r.sections);
  const pointsEarned = totalPointsEarned(r.sections);

  return (
    <Shell userId={user.id}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {assignment.title}
          </h1>
          <p className="text-sm text-ink-muted">
            {assignment.course ? `${assignment.course} · ` : ""}
            {new Date(attempt.created_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            <Link
              href={`/dashboard/assignments/${assignment.id}`}
              className="underline-offset-2 hover:text-ink hover:underline"
            >
              history &amp; settings
            </Link>
          </p>
        </div>
        <Link href="/dashboard" className="btn-ghost">
          ← Dashboard
        </Link>
      </div>

      {/* GRADE HERO */}
      <div className="card">
        <div className="rounded-xl bg-surface-subtle py-2">
          <GradeHero
            letter={r.letter_grade}
            score={r.score}
            low={r.estimated_range_low}
            high={r.estimated_range_high}
          />
        </div>

        <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-ink-muted">
          {r.disclaimer || DISCLAIMER}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <ScoringBasisBadge basis={r.scoring_basis} small />
          {pointsPossible > 0 && (
            <span>
              {round(pointsEarned, 1)} / {round(pointsPossible, 1)} points
            </span>
          )}
          {r.grading_basis_note && (
            <span className="basis-full text-center">{r.grading_basis_note}</span>
          )}
        </div>
      </div>

      {/* TOP THINGS TO FIX */}
      <section className="mt-7">
        <SectionLabel>Top things to fix</SectionLabel>
        <ol className="space-y-2.5">
          {thingsToFix.map((t, i) => (
            <li key={t.priority} className="card flex gap-3 p-4">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="font-semibold text-ink">{t.title}</h3>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                    {t.location}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{t.explanation}</p>
                <p className="mt-1 text-sm text-ink">
                  <span className="font-semibold text-brand-400">Fix: </span>
                  {t.suggestion}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* RUBRIC BREAKDOWN */}
      {r.sections.length > 0 && (
        <section className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {r.scoring_basis === "rubric" ? "Rubric breakdown" : "Breakdown"}
            </h2>
            <span className="text-xs text-ink-muted">
              {round(pointsEarned, 1)} / {round(pointsPossible, 1)}
            </span>
          </div>
          <div className="card divide-y divide-line p-0">
            {r.sections.map((c, i) => {
              const pct =
                c.points_possible > 0
                  ? (c.points_earned / c.points_possible) * 100
                  : 0;
              const gc = gradeColors(pct);
              return (
                <div key={i} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">{c.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-ink-soft">
                      {round(c.points_earned, 1)} / {round(c.points_possible, 1)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className={`h-full rounded-full ${gc.bar}`}
                      style={{ width: `${Math.max(3, Math.min(100, pct))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                    {c.feedback}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* WRITTEN RESPONSE FEEDBACK */}
      {written.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Written responses</SectionLabel>
          <div className="card divide-y divide-line p-0">
            {written.map((w, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{w.label}</h3>
                  <span className="text-sm font-semibold text-ink-soft">
                    {round(w.points_earned, 1)} / {round(w.points_possible, 1)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{w.why_points_lost}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  <span className="font-semibold text-brand-400">Fix: </span>
                  {w.how_to_improve}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* STRENGTHS */}
      {strengths.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Strengths</SectionLabel>
          <div className="card divide-y divide-line p-0">
            {strengths.map((s, i) => (
              <div key={i} className="flex gap-2.5 p-3.5">
                <span className="mt-0.5 text-grade-a" aria-hidden>
                  ✓
                </span>
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{s.title}. </span>
                  {s.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* GRAMMAR / CITATIONS */}
      {grammar.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Grammar / citations</SectionLabel>
          <div className="card divide-y divide-line p-0">
            {grammar.map((g, i) => (
              <div key={i} className="p-3.5">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{g.type}</span>
                  <span className="text-ink-muted"> — {g.location}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">{g.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OVERALL */}
      <section className="mt-7">
        <SectionLabel>Overall</SectionLabel>
        <div className="card">
          <p className="text-sm leading-relaxed text-ink-soft">
            {r.overall_feedback}
          </p>
        </div>
      </section>

      {/* SINGLE RE-GRADE CTA */}
      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-center">
        <p className="text-sm text-ink-soft">
          Fixed the issues above? Upload your revision and see if the estimate
          improves.
        </p>
        <Link
          href={`/grade?assignment=${assignment.id}`}
          className="btn-primary mt-3"
        >
          Check My Revision
        </Link>
        <div className="mt-3">
          <Link
            href="/grade"
            className="text-xs text-ink-muted hover:text-ink"
          >
            or grade something else
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">
            View your work
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {attempt.work_text || "(Your work was provided as images.)"}
          </p>
        </details>
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-soft">
            View grading materials
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {assignment.grading_materials_text ||
              "(Grading materials were provided as images.)"}
          </p>
        </details>
      </div>
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
      <main className="container-page flex-1 py-9">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
