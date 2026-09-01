/**
 * Usage-meter fill color, by PERCENT USED:
 *   0–50%  green · 50–75% yellow · 75–90% orange · 90–100% red
 * (Kept separate from the component so the thresholds are unit-tested.)
 */
export type UsageLevel = "green" | "yellow" | "orange" | "red";

export function usageLevel(pctUsed: number): UsageLevel {
  const p = Math.max(0, Math.min(100, pctUsed));
  if (p >= 90) return "red";
  if (p >= 75) return "orange";
  if (p >= 50) return "yellow";
  return "green";
}

const CLASS: Record<UsageLevel, string> = {
  green: "bg-grade-a",
  yellow: "bg-grade-c",
  orange: "bg-grade-d",
  red: "bg-grade-f",
};

export function usageFillClass(pctUsed: number): string {
  return CLASS[usageLevel(pctUsed)];
}

/** Clamped integer percentage of `used` against `limit`. */
export function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}
