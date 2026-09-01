import { round } from "@/lib/grading/grade-math";

export function gradeColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 80) return "text-brand-600";
  if (score >= 70) return "text-amber-600";
  return "text-rose-600";
}

export function GradeHero({
  letter,
  score,
  low,
  high,
  compact = false,
}: {
  letter: string;
  score: number;
  low: number;
  high: number;
  compact?: boolean;
}) {
  const color = gradeColor(score);
  return (
    <div className={compact ? "text-center" : "py-6 text-center"}>
      <p
        className={`font-semibold uppercase tracking-wide text-ink-muted ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        Estimated Grade
      </p>
      <div
        className={`mt-1 font-bold leading-none tracking-tight ${color} ${
          compact ? "text-4xl" : "text-7xl sm:text-8xl"
        }`}
      >
        {letter}
      </div>
      <div
        className={`mt-2 font-semibold ${color} ${
          compact ? "text-lg" : "text-3xl sm:text-4xl"
        }`}
      >
        ~{round(score)}%
      </div>
      {!compact && (
        <div className="mt-3 text-sm text-ink-muted">
          Estimated range{" "}
          <span className="font-medium text-ink-soft">
            {round(low)}–{round(high)}%
          </span>
        </div>
      )}
    </div>
  );
}
