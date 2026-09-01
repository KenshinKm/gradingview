"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading assignment requirements…",
  "Analyzing your essay…",
  "Applying your instructor's rubric…",
  "Calculating your estimated grade…",
  "Preparing your feedback…",
];

export function GradingLoader() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setI((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
      <p className="text-sm font-medium text-ink-soft">{MESSAGES[i]}</p>
      <p className="max-w-xs text-xs text-ink-muted">
        This usually takes 20–40 seconds. Please keep this tab open.
      </p>
    </div>
  );
}
