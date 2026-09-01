import Link from "next/link";
import { round } from "@/lib/grading/grade-math";
import { gradeColor } from "@/components/grade-hero";

interface Draft {
  id: string;
  draft_number: number;
  score: number | null;
  letter_grade: string | null;
}

export function DraftProgression({
  drafts,
  currentId,
}: {
  drafts: Draft[];
  currentId: string;
  assignmentId: string;
}) {
  return (
    <div className="card">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Your progress
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {drafts.map((d, i) => (
          <div key={d.id} className="flex items-center gap-2">
            <Link
              href={`/results/${d.id}`}
              className={`rounded-xl border px-4 py-3 text-center transition ${
                d.id === currentId
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-xs font-medium text-ink-muted">
                Draft {d.draft_number}
              </div>
              <div className={`text-lg font-bold ${gradeColor(d.score ?? 0)}`}>
                ~{round(d.score ?? 0)}%
              </div>
              <div className={`text-xs font-semibold ${gradeColor(d.score ?? 0)}`}>
                {d.letter_grade}
              </div>
            </Link>
            {i < drafts.length - 1 && (
              <span className="text-ink-muted" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
