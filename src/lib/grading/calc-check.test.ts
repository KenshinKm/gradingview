import { describe, it, expect } from "vitest";
import { evaluateExpression, reviewCalcChecks, closeEnough, applyCalcCorrections } from "./calc-check";

describe("evaluateExpression", () => {
  it("handles precedence, parentheses and powers", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2^3^2")).toBe(512);
    expect(evaluateExpression("-2^2")).toBe(-4);
    expect(evaluateExpression("2^-1")).toBe(0.5);
    expect(evaluateExpression("10 % 4")).toBe(2);
  });

  it("evaluates the quadratic formula", () => {
    expect(evaluateExpression("(5 + sqrt(5^2 - 4*1*6)) / (2*1)")).toBe(3);
    expect(evaluateExpression("(-(-7) - sqrt((-7)^2 - 4*1*(-7)*-1)) / 2")).toBeCloseTo((7 - Math.sqrt(49 - 28)) / 2);
  });

  it("supports constants, functions and scientific notation", () => {
    expect(evaluateExpression("2*pi")).toBeCloseTo(6.28318, 4);
    expect(evaluateExpression("6.022e23 * 2")).toBeCloseTo(1.2044e24, -18);
    expect(evaluateExpression("max(1, 5, 3) + log10(1000)")).toBe(8);
  });

  it("rejects anything that is not plain arithmetic", () => {
    for (const bad of [
      "",
      "x + 1",
      "process.exit(1)",
      "constructor",
      "import('fs')",
      "2 +",
      "(1 + 2",
      "1; 2",
      "a.b",
      "5 cm",
      "1/0",
      "sqrt(-1)",
      "'a'",
      "2(3)",
      "f(1)",
      "x".repeat(400),
    ]) {
      expect(() => evaluateExpression(bad), bad).toThrow();
    }
  });
});

describe("reviewCalcChecks", () => {
  it("confirms a correct claim and keeps the student's answer", () => {
    const { review, needsCheck } = reviewCalcChecks([
      { location: "Question 3", what: "Root of x^2-5x+6", expression: "(5 + sqrt(1)) / 2", claimed_correct: 3, student_answer: 2 },
    ]);
    expect(review).toHaveLength(1);
    expect(review[0]).toMatchObject({ status: "confirmed", computed: 3, claimed: 3, student: 2 });
    expect(needsCheck).toHaveLength(0);
  });

  it("flags a claim that disagrees with the computed value", () => {
    const { review, needsCheck } = reviewCalcChecks([
      { location: "Question 5", what: "Discriminant", expression: "(-3)^2 - 4*1*(-7)", claimed_correct: 21 },
    ]);
    expect(review[0].status).toBe("mismatch");
    expect(review[0].computed).toBe(37);
    expect(needsCheck).toHaveLength(1);
    expect(needsCheck[0].location).toBe("Question 5");
    expect(needsCheck[0].reason).toContain("37");
  });

  it("marks unparseable expressions as unverified without flagging", () => {
    const { review, needsCheck } = reviewCalcChecks([{ location: "Q1", expression: "x + 1", claimed_correct: 2 }]);
    expect(review[0].status).toBe("unverified");
    expect(needsCheck).toHaveLength(0);
  });

  it("returns nothing when disabled or malformed, and caps the count", () => {
    expect(reviewCalcChecks([{ expression: "1+1", claimed_correct: 2 }], { enabled: false }).review).toEqual([]);
    expect(reviewCalcChecks("nope").review).toEqual([]);
    const many = Array.from({ length: 30 }, () => ({ expression: "1+1", claimed_correct: 2 }));
    expect(reviewCalcChecks(many).review).toHaveLength(12);
  });

  it("tolerates rounding in the claimed value", () => {
    expect(closeEnough(3.14159, 3.14)).toBe(true);
    expect(closeEnough(3.14, 3.3)).toBe(false);
  });
});

describe("applyCalcCorrections", () => {
  const section = (name: string, earned: number, possible: number) => ({
    name,
    points_earned: earned,
    points_possible: possible,
    scoring_basis: "ai_inferred" as const,
    feedback: `${name} solved correctly.`,
  });

  const baseResult = (sections: ReturnType<typeof section>[]) => ({
    score: 100,
    letter_grade: "A+",
    estimated_range_low: 100,
    estimated_range_high: 100,
    scoring_basis: "ai_inferred" as const,
    inferred_rubric: true,
    grading_basis_note: "No point values given, so equal credit per question.",
    sections,
    written_response_feedback: [],
    things_to_fix: [{ priority: 1, title: "x", explanation: "y", location: "z", suggestion: "w" }],
    strengths: [],
    grammar_or_citation_issues: [],
    overall_feedback: "ok",
    disclaimer: "d",
  });

  it("replays the real bug: full credit on x-4=9 answered as 5 gets corrected and rescored", () => {
    const result = baseResult([
      section("Question 1", 25, 25),
      section("Question 2", 25, 25), // x - 4 = 9, student wrote x = 5 (correct is 13)
      section("Question 3", 25, 25),
      section("Question 4", 25, 25),
    ]);
    const review = reviewCalcChecks([
      { location: "Question 1", expression: "15 - 7", claimed_correct: 8, student_answer: 8 },
      { location: "Question 2", expression: "9 + 4", claimed_correct: 13, student_answer: 5 },
      { location: "Question 3", expression: "21 / 3", claimed_correct: 7, student_answer: 7 },
      { location: "Question 4", expression: "5 * 4", claimed_correct: 20, student_answer: 20 },
    ]).review;

    const out = applyCalcCorrections(result, review, { partialCreditAllowed: true });

    const q2 = out.sections.find((s) => s.name === "Question 2")!;
    expect(q2.points_earned).toBeLessThan(25 * 0.6);
    expect(q2.feedback).toContain("13");
    expect(q2.feedback).toContain("not 5");
    // Untouched, correct questions keep their original credit and wording.
    expect(out.sections.find((s) => s.name === "Question 1")).toEqual(section("Question 1", 25, 25));

    // 100 was never right; the corrected score must come down and never be a perfect 100 again.
    expect(out.score).toBeLessThan(100);
    expect(out.letter_grade).not.toBe("A+");
    expect(out.grading_basis_note).toContain("rescored");
  });

  it("caps at zero, not a partial-credit ceiling, when partial credit is switched off", () => {
    const result = baseResult([section("Question 1", 10, 10)]);
    const review = reviewCalcChecks([
      { location: "Question 1", expression: "9 + 4", claimed_correct: 13, student_answer: 5 },
    ]).review;
    const out = applyCalcCorrections(result, review, { partialCreditAllowed: false });
    expect(out.sections[0].points_earned).toBe(0);
  });

  it("does nothing when there is nothing to correct", () => {
    const result = baseResult([section("Question 1", 10, 10)]);
    expect(applyCalcCorrections(result, [], { partialCreditAllowed: true })).toBe(result);
    const confirmedRight = reviewCalcChecks([
      { location: "Question 1", expression: "9 + 4", claimed_correct: 13, student_answer: 13 },
    ]).review;
    expect(applyCalcCorrections(result, confirmedRight, { partialCreditAllowed: true })).toBe(result);
  });

  it("does not touch a section that already scored low, or one with no possible points", () => {
    const result = baseResult([section("Question 1", 2, 10)]);
    const review = reviewCalcChecks([
      { location: "Question 1", expression: "9 + 4", claimed_correct: 13, student_answer: 5 },
    ]).review;
    expect(applyCalcCorrections(result, review, { partialCreditAllowed: true })).toBe(result);
  });

  it("never corrects a section that plainly spans multiple questions", () => {
    const result = baseResult([section("Questions 1-3", 30, 30)]);
    const review = reviewCalcChecks([
      { location: "Question 2", expression: "9 + 4", claimed_correct: 13, student_answer: 5 },
    ]).review;
    expect(applyCalcCorrections(result, review, { partialCreditAllowed: true })).toBe(result);
  });

  it("leaves needs_check-only mismatches alone when the section wasn't over-credited", () => {
    // Model already gave a low score for Question 2 despite the wrong answer -- nothing to fix.
    const result = baseResult([section("Question 2", 3, 25)]);
    const review = reviewCalcChecks([
      { location: "Question 2", expression: "9 + 4", claimed_correct: 13, student_answer: 5 },
    ]).review;
    const out = applyCalcCorrections(result, review, { partialCreditAllowed: true });
    expect(out.sections[0].points_earned).toBe(3);
  });
});
