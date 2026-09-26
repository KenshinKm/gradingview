import { describe, it, expect } from "vitest";
import { evaluateExpression, reviewCalcChecks, closeEnough } from "./calc-check";

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
