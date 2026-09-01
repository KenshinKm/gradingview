import { describe, it, expect } from "vitest";
import {
  extractJson,
  normalizeResult,
  checkUnreadable,
  GradingValidationError,
  UnreadableImageError,
} from "./normalize";

const rubricModelOutput = {
  score: 999, // deliberately wrong — should be recomputed from sections
  letter_grade: "F", // deliberately wrong
  scoring_basis: "rubric",
  inferred_rubric: false,
  sections: [
    { name: "Thesis", points_earned: 18, points_possible: 20, scoring_basis: "rubric", feedback: "Solid." },
    { name: "Evidence", points_earned: 22, points_possible: 25, scoring_basis: "rubric", feedback: "Add sources." },
    { name: "Organization", points_earned: 17, points_possible: 20, scoring_basis: "rubric", feedback: "OK." },
    { name: "Grammar", points_earned: 14, points_possible: 15, scoring_basis: "rubric", feedback: "Minor errors." },
    { name: "Format", points_earned: 16, points_possible: 20, scoring_basis: "rubric", feedback: "Fix MLA." },
  ],
  things_to_fix: [
    { priority: 2, title: "Strengthen evidence", explanation: "P3 lacks a cited source.", location: "Paragraph 3", suggestion: "Add a peer-reviewed quotation." },
    { priority: 1, title: "Tie conclusion to thesis", explanation: "The conclusion drifts.", location: "Conclusion", suggestion: "Restate the thesis claim." },
  ],
  strengths: [{ title: "Clear thesis", explanation: "Stated in the intro." }],
  grammar_or_citation_issues: [{ type: "MLA", location: "Para 5", explanation: "Missing page number." }],
  overall_feedback: "Good draft, tighten evidence and citations.",
};

const mixedFormatOutput = {
  scoring_basis: "mixed",
  sections: [
    { name: "Multiple Choice", kind: "multiple_choice", points_earned: 27, points_possible: 30, scoring_basis: "answer_key", feedback: "3 wrong." },
    { name: "Short Answer", kind: "short_answer", points_earned: 18, points_possible: 25, scoring_basis: "ai_inferred", feedback: "Shallow." },
    { name: "Essay", kind: "essay", points_earned: 39, points_possible: 45, scoring_basis: "rubric", feedback: "Strong." },
  ],
  written_response_feedback: [
    { label: "Short Answer #3", points_earned: 2, points_possible: 5, why_points_lost: "No textual evidence.", how_to_improve: "Quote the passage." },
  ],
  things_to_fix: [
    { priority: 1, title: "Add evidence to SA#3", explanation: "Missing quote.", location: "Short Answer 3", suggestion: "Cite the text." },
  ],
  strengths: [],
  grammar_or_citation_issues: [],
  overall_feedback: "Mixed submission graded by section.",
};

describe("checkUnreadable", () => {
  it("does nothing for a normal grade object", () => {
    expect(() => checkUnreadable({ score: 90, sections: [] })).not.toThrow();
    expect(() => checkUnreadable({ unreadable_images: [] })).not.toThrow();
  });

  it("throws UnreadableImageError when the model reports unreadable images", () => {
    let caught: unknown;
    try {
      checkUnreadable({
        unreadable_images: [
          { label: "Your work — page 3", reason: "blurry" },
          { label: "Your work — page 5", reason: "too dark" },
        ],
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UnreadableImageError);
    const err = caught as UnreadableImageError;
    expect(err.images).toHaveLength(2);
    expect(err.studentMessage).toMatch(/page 3/i);
    expect(err.studentMessage).toMatch(/blurry/i);
    expect(err.studentMessage).toMatch(/retake/i);
  });

  it("tolerates alternate key names", () => {
    expect(() =>
      checkUnreadable({ unreadableImages: [{ page: "Page 2", issue: "glare" }] }),
    ).toThrow(UnreadableImageError);
  });
});

describe("extractJson", () => {
  it("parses raw JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("parses fenced JSON with prose around it", () => {
    expect(extractJson("Here:\n```json\n{\"a\": 2}\n```\nThanks!")).toEqual({ a: 2 });
  });
  it("throws when no object present", () => {
    expect(() => extractJson("no json here")).toThrow(GradingValidationError);
  });
});

describe("normalizeResult — rubric essay", () => {
  it("recomputes score from sections and fixes the letter grade", () => {
    const r = normalizeResult(rubricModelOutput);
    expect(r.score).toBe(87);
    expect(r.letter_grade).toBe("B+");
    expect(r.scoring_basis).toBe("rubric");
    expect(r.inferred_rubric).toBe(false);
    expect(r.disclaimer).toMatch(/rough estimate/i);
  });

  it("sorts things_to_fix by priority and renumbers", () => {
    const r = normalizeResult(rubricModelOutput);
    expect(r.things_to_fix[0].title).toBe("Tie conclusion to thesis");
    expect(r.things_to_fix.map((t) => t.priority)).toEqual([1, 2]);
  });

  it("derives a sane estimated range around the score", () => {
    const r = normalizeResult(rubricModelOutput);
    expect(r.estimated_range_low).toBeLessThanOrEqual(r.score);
    expect(r.estimated_range_high).toBeGreaterThanOrEqual(r.score);
    expect(r.estimated_range_high - r.estimated_range_low).toBeLessThanOrEqual(25);
  });

  it("accepts the legacy 'rubric_categories' key", () => {
    const { sections, ...rest } = rubricModelOutput;
    const r = normalizeResult({ ...rest, rubric_categories: sections });
    expect(r.score).toBe(87);
    expect(r.sections).toHaveLength(5);
  });
});

describe("normalizeResult — mixed format", () => {
  it("totals across sections to 84% and keeps mixed basis", () => {
    const r = normalizeResult(mixedFormatOutput);
    expect(r.score).toBe(84);
    expect(r.letter_grade).toBe("B");
    expect(r.scoring_basis).toBe("mixed");
    expect(r.inferred_rubric).toBe(true); // a section was ai_inferred
  });

  it("preserves per-section scoring basis and written-response feedback", () => {
    const r = normalizeResult(mixedFormatOutput);
    expect(r.sections.map((s) => s.scoring_basis)).toEqual([
      "answer_key",
      "ai_inferred",
      "rubric",
    ]);
    expect(r.written_response_feedback[0].label).toBe("Short Answer #3");
  });
});

describe("normalizeResult — inference & errors", () => {
  it("marks inferred and keeps model score when no sections", () => {
    const r = normalizeResult({
      score: 82,
      things_to_fix: [
        { priority: 1, title: "x", explanation: "y", location: "z", suggestion: "w" },
      ],
      overall_feedback: "ok",
      sections: [],
    });
    expect(r.inferred_rubric).toBe(true);
    expect(r.scoring_basis).toBe("ai_inferred");
    expect(r.score).toBe(82);
    expect(r.letter_grade).toBe("B-");
  });

  it("throws when there are no actionable fixes", () => {
    expect(() =>
      normalizeResult({ score: 90, sections: [], things_to_fix: [], overall_feedback: "great" }),
    ).toThrow(GradingValidationError);
  });

  it("throws when the score cannot be determined", () => {
    expect(() =>
      normalizeResult({
        sections: [],
        things_to_fix: [
          { priority: 1, title: "x", explanation: "y", location: "z", suggestion: "w" },
        ],
        overall_feedback: "hi",
      }),
    ).toThrow(GradingValidationError);
  });

  it("rejects a completely malformed object", () => {
    expect(() => normalizeResult(null)).toThrow(GradingValidationError);
  });
});
