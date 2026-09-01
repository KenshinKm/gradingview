/**
 * Semantic grade colors. The estimated grade is the strongest color element
 * in the UI — everything else stays restrained.
 *
 * A → green · B → yellow-green · C → yellow · D → orange · F → red
 */
export type GradeBand = "a" | "b" | "c" | "d" | "f";

export function gradeBand(score: number): GradeBand {
  if (score >= 90) return "a";
  if (score >= 80) return "b";
  if (score >= 70) return "c";
  if (score >= 60) return "d";
  return "f";
}

export interface GradeColorSet {
  /** raw hex — for inline SVG / gradient / glow */
  hex: string;
  /** big number / letter */
  text: string;
  /** progress bar / score indicator fill */
  bar: string;
  /** faint tinted surface */
  soft: string;
  /** subtle border */
  border: string;
  /** focus ring / accent ring */
  ring: string;
}

const SETS: Record<GradeBand, GradeColorSet> = {
  a: {
    hex: "#37d9a4",
    text: "text-grade-a",
    bar: "bg-grade-a",
    soft: "bg-grade-a/10",
    border: "border-grade-a/35",
    ring: "ring-grade-a/30",
  },
  b: {
    hex: "#9ade5b",
    text: "text-grade-b",
    bar: "bg-grade-b",
    soft: "bg-grade-b/10",
    border: "border-grade-b/35",
    ring: "ring-grade-b/30",
  },
  c: {
    hex: "#f4c948",
    text: "text-grade-c",
    bar: "bg-grade-c",
    soft: "bg-grade-c/10",
    border: "border-grade-c/35",
    ring: "ring-grade-c/30",
  },
  d: {
    hex: "#f79150",
    text: "text-grade-d",
    bar: "bg-grade-d",
    soft: "bg-grade-d/10",
    border: "border-grade-d/35",
    ring: "ring-grade-d/30",
  },
  f: {
    hex: "#f2686b",
    text: "text-grade-f",
    bar: "bg-grade-f",
    soft: "bg-grade-f/10",
    border: "border-grade-f/35",
    ring: "ring-grade-f/30",
  },
};

export function gradeColors(score: number): GradeColorSet {
  return SETS[gradeBand(score)];
}
