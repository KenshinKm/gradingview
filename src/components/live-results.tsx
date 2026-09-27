"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PartialResult } from "@/lib/grading/partial";
import { gradeColors } from "@/lib/grade-colors";
import type { Subject } from "@/lib/grading/subjects";
import { GradingLoader } from "./grading-loader";

const POLL_MS = 1000;

/**
 * Text that types itself out toward `text` as more of it arrives, like a chat
 * reply. `animate` is false for content that was already there when the page
 * opened, so reloading doesn't replay it.
 */
function Typed({ text, animate, writing }: { text: string; animate: boolean; writing?: boolean }) {
  const [n, setN] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => {
      setN((prev) => {
        const gap = text.length - prev;
        if (gap <= 0) return prev;
        // Steady typing, but catch up quickly when the AI is ahead of us.
        return prev + Math.max(1, Math.ceil(gap * 0.12));
      });
    }, 30);
    return () => clearInterval(t);
  }, [text, animate]);

  const shown = animate ? text.slice(0, n) : text;
  const typing = animate && (n < text.length || writing);
  return (
    <>
      {shown}
      {typing && (
        <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-ink-muted" />
      )}
    </>
  );
}

/**
 * Shown while a grade is being made. Pieces appear here as the AI writes them
 * (what we understood, each section, each fix). The overall grade is added by
 * the server when everything is finished, and the page then refreshes into the
 * full result. Only a finished grade is charged.
 */
export function LiveResults({
  attemptId,
  initial,
  subject = "english",
}: {
  attemptId: string;
  initial: PartialResult | null;
  subject?: Subject;
}) {
  const router = useRouter();
  const [partial, setPartial] = useState<PartialResult | null>(initial);
  const [seconds, setSeconds] = useState(0);
  const done = useRef(false);
  // Items already on screen when the page opened show instantly; new ones type out.
  const seen = useRef({
    sections: initial?.sections.length ?? 0,
    fixes: initial?.things_to_fix.length ?? 0,
  });

  useEffect(() => {
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    const poll = setInterval(async () => {
      if (done.current) return;
      try {
        const res = await fetch(`/api/grade/status?attemptId=${attemptId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "processing") {
          if (data.partial) setPartial(data.partial as PartialResult);
        } else {
          // complete or failed: let the server render the real page
          done.current = true;
          router.refresh();
        }
      } catch {
        // keep trying; a dropped request isn't a failed grade
      }
    }, POLL_MS);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [attemptId, router]);

  const hasAny =
    !!partial &&
    (!!partial.understood || partial.sections.length > 0 || partial.things_to_fix.length > 0);
  const slow = seconds >= (subject === "english" ? 45 : 90);

  if (!hasAny) return <GradingLoader subject={subject} attemptId={null} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {slow ? "Still working. Longer work takes a bit more time." : "Grading in progress"}
          </p>
          <p className="text-xs text-ink-muted">
            Your grade appears when everything is scored. You&apos;re only charged if it finishes.
          </p>
        </div>
      </div>

      {partial?.understood && (
        <div className="animate-fade-in rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            What we understood
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            {(
              [
                ["Subject", partial.understood.subject],
                ["Level", partial.understood.level],
                ["Topic", partial.understood.topic],
                ["Assignment", partial.understood.assignment],
                ["Graded on", partial.understood.graded_on],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-ink-muted">{k}</dt>
                <dd className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {partial && partial.sections.length > 0 && (
        <section className="animate-fade-in">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Breakdown
          </h2>
          <div className="card divide-y divide-line p-0">
            {partial.sections.map((c, i) => {
              const pct = c.points_possible > 0 ? (c.points_earned / c.points_possible) * 100 : 0;
              const gc = gradeColors(pct);
              return (
                <div key={i} className="animate-fade-in p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">{c.name}</h3>
                    <span className="shrink-0 text-sm font-semibold text-ink-soft">
                      {c.points_possible > 0
                        ? `${Math.round(c.points_earned * 10) / 10} / ${Math.round(c.points_possible * 10) / 10}`
                        : "…"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${gc.bar}`}
                      style={{ width: `${c.points_possible > 0 ? Math.max(3, Math.min(100, pct)) : 0}%` }}
                    />
                  </div>
                  {(c.feedback || c.writing) && (
                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                      <Typed text={c.feedback} animate={i >= seen.current.sections} writing={c.writing} />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {partial && partial.things_to_fix.length > 0 && (
        <section className="animate-fade-in">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Top things to fix
          </h2>
          <ol className="space-y-2.5">
            {partial.things_to_fix.map((t, i) => (
              <li key={i} className="card animate-fade-in flex gap-3 p-4">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-semibold text-ink">
                      <Typed text={t.title} animate={i >= seen.current.fixes} writing={t.writing && !t.explanation} />
                    </h3>
                    {t.location && (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                        {t.location}
                      </span>
                    )}
                  </div>
                  {t.explanation && (
                    <p className="mt-1 text-sm text-ink-soft">
                      <Typed text={t.explanation} animate={i >= seen.current.fixes} writing={t.writing && !t.suggestion} />
                    </p>
                  )}
                  {t.suggestion && (
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-semibold text-brand-400">Fix: </span>
                      <Typed text={t.suggestion} animate={i >= seen.current.fixes} writing={t.writing} />
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
