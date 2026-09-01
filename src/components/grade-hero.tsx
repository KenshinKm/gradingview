import { round } from "@/lib/grading/grade-math";
import { gradeColors } from "@/lib/grade-colors";

/** Back-compat: some views only need the text color class. */
export function gradeColor(score: number): string {
  return gradeColors(score).text;
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
  const c = gradeColors(score);

  if (compact) {
    return (
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Estimated Grade
        </p>
        <div className={`mt-1 text-4xl font-bold leading-none tracking-tight ${c.text}`}>
          {letter}
        </div>
        <div className={`mt-1.5 text-lg font-semibold ${c.text}`}>~{round(score)}%</div>
      </div>
    );
  }

  return (
    <div className="relative py-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(220px 160px at 50% 42%, ${c.hex}22, transparent 70%)`,
        }}
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Estimated Grade
        </p>
        <div
          className={`mt-3 text-7xl font-bold leading-none tracking-tight sm:text-8xl ${c.text}`}
          style={{ textShadow: `0 0 44px ${c.hex}44` }}
        >
          {letter}
        </div>
        <div className={`mt-3 text-3xl font-semibold sm:text-4xl ${c.text}`}>
          ~{round(score)}%
        </div>
        <div className="mt-4 text-sm text-ink-muted">
          Likely range{" "}
          <span className="font-medium text-ink-soft">
            {round(low)}–{round(high)}%
          </span>
        </div>
      </div>
    </div>
  );
}
