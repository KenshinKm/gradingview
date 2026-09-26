import { describe, it, expect } from "vitest";
import {
  checkContextMismatch,
  ContextMismatchError,
  normalizeResult,
} from "./normalize";

const good = {
  sections: [{ name: "Thesis", points_earned: 16, points_possible: 20, feedback: "Clear." }],
  things_to_fix: [
    { priority: 1, title: "Thesis", explanation: "It describes.", location: "Paragraph 1", suggestion: "Argue a point." },
  ],
  overall_feedback: "Solid essay.",
};

describe("checkContextMismatch", () => {
  it("does nothing for a normal graded result", () => {
    expect(() => checkContextMismatch(good)).not.toThrow();
    expect(() => checkContextMismatch(null)).not.toThrow();
  });

  it("throws a ContextMismatchError with a friendly message", () => {
    const input = {
      context_mismatch: {
        summary: "Your work looks like math problems, but the rubric is for an essay.",
        detected: "Math worksheet",
        expected: "Essay rubric",
        suggestion: "Check that you uploaded the right rubric.",
      },
    };
    try {
      checkContextMismatch(input);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ContextMismatchError);
      expect((e as ContextMismatchError).studentMessage).toContain("looks like math problems");
      expect((e as ContextMismatchError).studentMessage).toContain("right rubric");
    }
  });

  it("falls back to a generic message when the model gives no details", () => {
    try {
      checkContextMismatch({ context_mismatch: {} });
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as ContextMismatchError).studentMessage).toContain("Double-check");
    }
  });
});

describe("understood and needs_check normalization", () => {
  it("passes through the understood summary and fills blanks", () => {
    const r = normalizeResult({
      ...good,
      understood: { subject: "English", level: "High school", topic: "Gatsby", assignment: "Essay", graded_on: "" },
    });
    expect(r.understood?.topic).toBe("Gatsby");
    expect(r.understood?.graded_on).toBe("Not specified");
  });

  it("omits understood when the model does not return it", () => {
    expect(normalizeResult(good).understood).toBeUndefined();
  });

  it("keeps needs_check items, drops empty reasons, and caps at 4", () => {
    const r = normalizeResult({
      ...good,
      needs_check: [
        { location: "Q2", reason: "Unclear handwriting." },
        { location: "Q3", reason: "" },
        ...Array.from({ length: 6 }, (_, i) => ({ location: `Q${i + 4}`, reason: "Unsure." })),
      ],
    });
    expect(r.needs_check?.length).toBe(4);
    expect(r.needs_check?.[0]).toEqual({ location: "Q2", reason: "Unclear handwriting." });
  });

  it("does not add needs_check when there is nothing to check", () => {
    expect(normalizeResult(good).needs_check).toBeUndefined();
  });

  it("still recomputes the score from sections", () => {
    expect(normalizeResult({ ...good, score: 5 }).score).toBe(80);
  });
});
