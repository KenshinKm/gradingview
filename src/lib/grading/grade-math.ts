import type { Section } from "./schema";

export interface LetterBand {
  letter: string;
  min: number;
}

/** Standard US letter-grade bands (percent floor). */
export const LETTER_BANDS: LetterBand[] = [
  { letter: "A+", min: 97 },
  { letter: "A", min: 93 },
  { letter: "A-", min: 90 },
  { letter: "B+", min: 87 },
  { letter: "B", min: 83 },
  { letter: "B-", min: 80 },
  { letter: "C+", min: 77 },
  { letter: "C", min: 73 },
  { letter: "C-", min: 70 },
  { letter: "D+", min: 67 },
  { letter: "D", min: 63 },
  { letter: "D-", min: 60 },
  { letter: "F", min: 0 },
];

export function letterForPercent(percent: number): string {
  const p = clampPercent(percent);
  for (const band of LETTER_BANDS) {
    if (p >= band.min) return band.letter;
  }
  return "F";
}

export function clampPercent(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

type PointBucket = Pick<Section, "points_earned" | "points_possible">;

/**
 * Compute a percentage from graded sections, correctly handling
 * non-100-point totals (e.g. a rubric out of 60, or a 4-point scale).
 */
export function percentFromSections(sections: PointBucket[]): number | null {
  if (!sections.length) return null;
  const possible = sections.reduce((s, c) => s + (c.points_possible || 0), 0);
  if (possible <= 0) return null;
  const earned = sections.reduce((s, c) => s + (c.points_earned || 0), 0);
  return clampPercent((earned / possible) * 100);
}

export function totalPointsPossible(sections: PointBucket[]): number {
  return round(
    sections.reduce((s, c) => s + (c.points_possible || 0), 0),
    2,
  );
}

export function totalPointsEarned(sections: PointBucket[]): number {
  return round(
    sections.reduce((s, c) => s + (c.points_earned || 0), 0),
    2,
  );
}

/**
 * Derive a defensible estimated range around a score.
 * Wider when scoring was inferred (no rubric or answer key).
 */
export function estimatedRange(
  score: number,
  inferred: boolean,
): { low: number; high: number } {
  const spread = inferred ? 6 : 3;
  return {
    low: round(clampPercent(score - spread)),
    high: round(clampPercent(score + spread)),
  };
}
