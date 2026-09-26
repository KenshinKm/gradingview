/**
 * AI-cost alerts. Every finished grade stores its estimated cost in
 * result.usage.cost_usd. After each grade the job adds up the student's month
 * and logs a "[cost-alert]" line when they (or one grade) cost more than
 * expected. Search for that tag in the Vercel runtime logs.
 */

export interface CostThresholds {
  /** Alert when one student's AI cost for the calendar month reaches this. */
  monthlyUsd: number;
  /** Alert when a single grade costs this much or more. */
  perGradeUsd: number;
}

export const DEFAULT_COST_THRESHOLDS: CostThresholds = {
  monthlyUsd: 5,
  perGradeUsd: 0.5,
};

/** Reads COST_ALERT_MONTHLY_USD / COST_ALERT_GRADE_USD, falling back to the defaults. */
export function costThresholdsFromEnv(env: Record<string, string | undefined> = process.env): CostThresholds {
  const pick = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    monthlyUsd: pick(env.COST_ALERT_MONTHLY_USD, DEFAULT_COST_THRESHOLDS.monthlyUsd),
    perGradeUsd: pick(env.COST_ALERT_GRADE_USD, DEFAULT_COST_THRESHOLDS.perGradeUsd),
  };
}

export interface CostAlert {
  kind: "grade" | "month";
  message: string;
}

/** Pure decision: which alerts, if any, does this grade trigger? */
export function evaluateCost(
  gradeUsd: number | null | undefined,
  monthUsd: number,
  t: CostThresholds = DEFAULT_COST_THRESHOLDS,
): CostAlert[] {
  const alerts: CostAlert[] = [];
  if (typeof gradeUsd === "number" && gradeUsd >= t.perGradeUsd) {
    alerts.push({ kind: "grade", message: `one grade cost $${gradeUsd.toFixed(2)} (limit $${t.perGradeUsd.toFixed(2)})` });
  }
  if (monthUsd >= t.monthlyUsd) {
    alerts.push({ kind: "month", message: `month total $${monthUsd.toFixed(2)} (limit $${t.monthlyUsd.toFixed(2)})` });
  }
  return alerts;
}

/** Start of the current calendar month (UTC), ISO string. */
export function monthStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Sums cost values that may be strings, numbers, or missing. */
export function sumCosts(rows: Array<{ cost: unknown }>): number {
  let total = 0;
  for (const r of rows) {
    const n = Number(r.cost);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}
