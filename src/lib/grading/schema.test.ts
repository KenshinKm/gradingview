import { describe, it, expect } from "vitest";
import { gradeResultSchema, DISCLAIMER } from "./schema";

const valid = {
  score: 87,
  letter_grade: "B+",
  estimated_range_low: 84,
  estimated_range_high: 90,
  scoring_basis: "rubric" as const,
  inferred_rubric: false,
  grading_basis_note: "Graded against the provided 100-point rubric.",
  sections: [
    {
      name: "Thesis",
      points_earned: 18,
      points_possible: 20,
      scoring_basis: "rubric" as const,
      feedback: "ok",
    },
  ],
  written_response_feedback: [],
  things_to_fix: [
    {
      priority: 1,
      title: "Fix evidence",
      explanation: "weak",
      location: "P3",
      suggestion: "add a source",
    },
  ],
  strengths: [],
  grammar_or_citation_issues: [],
  overall_feedback: "solid",
  disclaimer: DISCLAIMER,
};

describe("gradeResultSchema", () => {
  it("accepts a valid result", () => {
    expect(gradeResultSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects out-of-range scores", () => {
    expect(gradeResultSchema.safeParse({ ...valid, score: 120 }).success).toBe(false);
  });

  it("rejects an invalid scoring_basis", () => {
    expect(
      gradeResultSchema.safeParse({ ...valid, scoring_basis: "vibes" }).success,
    ).toBe(false);
  });

  it("rejects an empty things_to_fix array", () => {
    expect(gradeResultSchema.safeParse({ ...valid, things_to_fix: [] }).success).toBe(
      false,
    );
  });

  it("rejects missing overall_feedback", () => {
    const { overall_feedback, ...rest } = valid;
    void overall_feedback;
    expect(gradeResultSchema.safeParse(rest).success).toBe(false);
  });

  it("defaults written_response_feedback to an empty array", () => {
    const { written_response_feedback, ...rest } = valid;
    void written_response_feedback;
    const parsed = gradeResultSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.written_response_feedback).toEqual([]);
  });
});
