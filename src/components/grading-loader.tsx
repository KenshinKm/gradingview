"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Subject } from "@/lib/grading/subjects";

const MESSAGES: Record<Subject, string[]> = {
  english: [
    "Reading your grading materials…",
    "Analyzing your work…",
    "Applying the rubric and answer key…",
    "Scoring each section…",
    "Calculating your estimated grade…",
    "Preparing your feedback…",
  ],
  math: [
    "Reading your problems…",
    "Solving each one on our side…",
    "Checking your steps…",
    "Re-running the calculations…",
    "Working out partial credit…",
    "Preparing your feedback…",
  ],
  science: [
    "Reading your grading materials…",
    "Checking your data and graphs…",
    "Re-running the calculations…",
    "Scoring each section…",
    "Calculating your estimated grade…",
    "Preparing your feedback…",
  ],
};

const USUALLY: Record<Subject, string> = {
  english: "This usually takes 20 to 40 seconds.",
  math: "Math usually takes about a minute.",
  science: "Science usually takes about a minute.",
};

export function GradingLoader({
  subject = "english",
  attemptId = null,
}: {
  subject?: Subject;
  attemptId?: string | null;
}) {
  const [i, setI] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const messages = MESSAGES[subject];

  useEffect(() => {
    const t = setInterval(() => {
      setI((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
    }, subject === "english" ? 3500 : 7000);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, [messages.length, subject]);

  const slow = seconds >= (subject === "english" ? 45 : 90);

  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-brand-600" />
      <p className="text-sm font-medium text-ink-soft">
        {slow ? "Still working. Longer work takes a bit more time." : messages[i]}
      </p>
      <p className="max-w-xs text-xs text-ink-muted">{USUALLY[subject]}</p>
      {seconds >= 15 && attemptId && (
        <p className="max-w-xs text-xs leading-relaxed text-ink-muted">
          You can leave this page. We keep grading, and you&apos;re only charged if it
          finishes.{" "}
          <Link href={`/results/${attemptId}`} className="text-ink-soft underline underline-offset-2">
            Open my result page
          </Link>
        </p>
      )}
    </div>
  );
}
