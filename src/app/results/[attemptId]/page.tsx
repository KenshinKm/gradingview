import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { LiveResults } from "@/components/live-results";
import { MismatchActions } from "@/components/mismatch-actions";
import type { PartialResult } from "@/lib/grading/partial";
import { GradeHero } from "@/components/grade-hero";
import { ScoringBasisBadge } from "@/components/scoring-basis-badge";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import { DISCLAIMER } from "@/lib/grading/schema";
import { totalPointsEarned, totalPointsPossible, round } from "@/lib/grading/grade-math";
import { gradeColors } from "@/lib/grade-colors";
import type { GradingAttempt, Assignment } from "@/lib/types";
import { SUBJECT_CONFIG, REPORT_EMAIL } from "@/lib/subject-config";
import { STALE_PROCESSING_MS } from "@/lib/grading/timing";
import { parseSubject } from "@/lib/grading/subjects";

export const metadata = { title: "Your estimated grade" };
export const dynamic = "force-dynamic";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
      {children}
    </h2>
  );
}

function ReportLink({ href }: { href: string }) {
  return (
    <a
      className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink-soft"
      href={href}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
        <path
          d="M5 3v18M5 4h11l-2.5 4L16 12H5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Report if this looks wrong
    </a>
  );
}

function reportHref(attemptId: string, subject: string, about: string) {
  const subj = `${subject} beta: this looks wrong`;
  const body = `Attempt: ${attemptId}\nAbout: ${about}\n\nWhat looks wrong:\n`;
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
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

  const stored = attempt.result as unknown as {
    blocked?: { code?: string; mismatch?: { summary?: string; suggestion?: string } };
    partial?: PartialResult;
  } | null;

  if (attempt.status === "failed") {
    const mismatch = stored?.blocked?.code === "context_mismatch";
    return (
      <Shell userId={user.id}>
        <div className="card text-center">
          <h1 className="text-xl font-semibold text-ink">
            {mismatch ? "Before we grade this, double-check your files" : "Grading didn't finish"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {attempt.error_message ||
              "Something went wrong while grading this submission."}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Your grading credit was not used.
          </p>
          {mismatch ? (
            <MismatchActions attemptId={attempt.id} assignmentId={assignment.id} />
          ) : (
            <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary mt-4">
              Try again
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  if (attempt.status !== "complete" || !attempt.result || stored?.partial) {
    // Grading runs in the background. A job stuck this long has died and was never charged.
    const stuck = Date.now() - new Date(attempt.created_at).getTime() > STALE_PROCESSING_MS;
    if (stuck) {
      return (
        <Shell userId={user.id}>
          <div className="card text-center">
            <h1 className="text-xl font-semibold text-ink">Grading didn&apos;t finish</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              This grade took too long and didn&apos;t finish. Your credit was not used.
            </p>
            <Link href={`/grade?assignment=${assignment.id}`} className="btn-primary mt-4">
              Try again
            </Link>
          </div>
        </Shell>
      );
    }
    return (
      <Shell userId={user.id}>
        <div className="mb-5">
          <h1 className="text-xl font-bold tracking-tight text-ink">{assignment.title}</h1>
          <p className="text-sm text-ink-muted">
            {assignment.course ? `${assignment.course} · ` : ""}Your results appear here as they&apos;re ready
          </p>
        </div>
        <LiveResults
          attemptId={attempt.id}
          initial={stored?.partial ?? null}
          subject={parseSubject(stored?.partial?.understood?.subject?.toLowerCase())}
        />
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
  const subjectCfg = SUBJECT_CONFIG[parseSubject(r.understood?.subject_code)];
  const beta = subjectCfg.beta;

  return (
    <Shell userId={user.id}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-ink">
            {assignment.title}
            {beta && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: subjectCfg.color, backgroundColor: `${subjectCfg.color}1f` }}
              >
                {subjectCfg.name} beta
              </span>
            )}
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

      {/* WHAT WE UNDERSTOOD */}
      {r.understood && (
        <div className="mb-5 rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            What we understood
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            {(
              [
                ["Subject", r.understood.subject],
                ["Level", r.understood.level],
                ["Topic", r.understood.topic],
                ["Assignment", r.understood.assignment],
                ["Graded on", r.understood.graded_on],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-ink-muted">{k}</dt>
                <dd className="mt-0.5 text-[13px] font-semibold leading-snug text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

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

      {beta && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-subtle px-4 py-3 text-xs text-ink-muted">
          <span>
            {subjectCfg.name} grading is in beta. Double-check anything that looks off.
          </span>
          <a
            className="font-medium text-ink-soft underline-offset-2 hover:underline"
            href={reportHref(attemptId, subjectCfg.name, "overall grade")}
          >
            Report a problem
          </a>
        </div>
      )}

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
                {beta && (
                  <ReportLink href={reportHref(attemptId, subjectCfg.name, `fix: ${t.title} (${t.location})`)} />
                )}
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
                  {beta && (
                    <ReportLink href={reportHref(attemptId, subjectCfg.name, `section: ${c.name}`)} />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CALCULATIONS WE RE-CHECKED (Math and Science) */}
      {r.calc_review && r.calc_review.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Calculations we re-checked</SectionLabel>
          <div className="card divide-y divide-line p-0">
            {r.calc_review.map((c, i) => {
              const studentRight =
                c.student !== null && c.computed !== null
                  ? Math.abs(c.student - c.computed) <= 0.005 * Math.max(1, Math.abs(c.computed))
                  : null;
              return (
                <div key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {c.location}
                      {c.what && <span className="ml-2 text-xs font-normal text-ink-muted">{c.what}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {c.computed !== null ? (
                        <>
                          Correct answer <span className="font-medium text-ink-soft">{Number(c.computed.toPrecision(6))}</span>
                          {c.student !== null && (
                            <>
                              {" · "}Your answer{" "}
                              <span className="font-medium text-ink-soft">{Number(c.student.toPrecision(6))}</span>
                            </>
                          )}
                        </>
                      ) : (
                        "We couldn't re-run this one"
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.status === "mismatch"
                        ? "bg-amber-500/15 text-amber-200"
                        : c.status === "unverified"
                          ? "border border-line text-ink-muted"
                          : studentRight === false
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-grade-a/15 text-grade-a"
                    }`}
                  >
                    {c.status === "mismatch"
                      ? "Check this"
                      : c.status === "unverified"
                        ? "Not verified"
                        : studentRight === false
                          ? "Answer differs"
                          : "Verified"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            We recomputed these with real arithmetic instead of trusting the AI.
          </p>
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

      {/* NEEDS YOUR CHECK */}
      {r.needs_check && r.needs_check.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Needs your check</SectionLabel>
          <div className="card divide-y divide-line p-0">
            <p className="p-3.5 text-xs text-ink-muted">
              We weren&apos;t sure about these, so we did not deduct points for them. Take a quick look.
            </p>
            {r.needs_check.map((n, i) => (
              <div key={i} className="flex gap-2.5 p-3.5">
                <span className="mt-0.5 text-grade-c" aria-hidden>
                  !
                </span>
                <p className="text-sm text-ink-soft">
                  <span className="font-semibold text-ink">{n.location}. </span>
                  {n.reason}
                </p>
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
