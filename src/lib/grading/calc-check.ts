import type { NeedsCheck } from "./schema";

/**
 * Real arithmetic checks for Math and Science. The model writes a plain
 * expression for the correct answer plus the value it believes that expression
 * gives. We evaluate the expression ourselves and compare, so a slip in the
 * model's own arithmetic gets flagged instead of silently graded.
 *
 * The evaluator is a tiny recursive-descent parser (numbers, + - * / ^ %,
 * parentheses and a short list of functions). Nothing else is accepted, so
 * text from a student's paper can't turn into code.
 */

export type CalcStatus = "confirmed" | "mismatch" | "unverified";

export interface CalcReview {
  location: string;
  what: string;
  expression: string;
  /** Value we computed from the expression. Null when it could not be evaluated. */
  computed: number | null;
  /** Value the grader said the expression gives. */
  claimed: number | null;
  /** The student's final numeric answer, when the grader could read one. */
  student: number | null;
  status: CalcStatus;
}

const MAX_EXPR = 300;
const MAX_CHECKS = 12;
const REL_TOL = 0.005;
const ABS_TOL = 1e-9;

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

class ParseError extends Error {}

/** Evaluates a plain arithmetic expression. Throws on anything unexpected. */
export function evaluateExpression(input: string): number {
  const src = input.trim();
  if (!src || src.length > MAX_EXPR) throw new ParseError("bad length");
  let pos = 0;

  const peek = () => src[pos];
  const skip = () => {
    while (pos < src.length && /\s/.test(src[pos])) pos++;
  };

  function number(): number {
    const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(pos));
    if (!m) throw new ParseError("number expected");
    pos += m[0].length;
    return Number(m[0]);
  }

  function primary(): number {
    skip();
    const c = peek();
    if (c === undefined) throw new ParseError("unexpected end");
    if (c === "(") {
      pos++;
      const v = additive();
      skip();
      if (peek() !== ")") throw new ParseError("missing )");
      pos++;
      return v;
    }
    if (/[\d.]/.test(c)) return number();
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(pos));
    if (!id) throw new ParseError(`unexpected ${c}`);
    const name = id[0].toLowerCase();
    pos += id[0].length;
    skip();
    if (peek() === "(") {
      const fn = FUNCTIONS[name];
      if (!fn) throw new ParseError(`unknown function ${name}`);
      pos++;
      const args: number[] = [];
      skip();
      if (peek() !== ")") {
        for (;;) {
          args.push(additive());
          skip();
          if (peek() === ",") {
            pos++;
            continue;
          }
          break;
        }
      }
      if (peek() !== ")") throw new ParseError("missing )");
      pos++;
      if (args.length === 0 || args.length > 4) throw new ParseError("bad args");
      return fn(...args);
    }
    if (name in CONSTANTS) return CONSTANTS[name];
    throw new ParseError(`unknown name ${name}`);
  }

  function unary(): number {
    skip();
    if (peek() === "-") {
      pos++;
      return -unary();
    }
    if (peek() === "+") {
      pos++;
      return unary();
    }
    return power();
  }

  function power(): number {
    const base = primary();
    skip();
    if (peek() === "^" || (peek() === "*" && src[pos + 1] === "*")) {
      pos += peek() === "^" ? 1 : 2;
      const exp = unary(); // right associative, allows 2^-3
      return Math.pow(base, exp);
    }
    return base;
  }

  function multiplicative(): number {
    let v = unary();
    for (;;) {
      skip();
      const c = peek();
      if (c === "*" && src[pos + 1] !== "*") {
        pos++;
        v *= unary();
      } else if (c === "/") {
        pos++;
        v /= unary();
      } else if (c === "%") {
        pos++;
        v %= unary();
      } else return v;
    }
  }

  function additive(): number {
    let v = multiplicative();
    for (;;) {
      skip();
      const c = peek();
      if (c === "+") {
        pos++;
        v += multiplicative();
      } else if (c === "-") {
        pos++;
        v -= multiplicative();
      } else return v;
    }
  }

  const result = additive();
  skip();
  if (pos < src.length) throw new ParseError(`unexpected ${src[pos]}`);
  if (!Number.isFinite(result)) throw new ParseError("not finite");
  return result;
}

/** True when two numbers agree within rounding the grader might reasonably have done. */
export function closeEnough(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  return diff <= ABS_TOL || diff <= REL_TOL * Math.max(Math.abs(a), Math.abs(b));
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function short(v: number): string {
  return String(Number(v.toPrecision(6)));
}

export interface CalcReviewResult {
  review: CalcReview[];
  needsCheck: NeedsCheck[];
}

/** Verifies the grader's `calc_checks` and turns disagreements into "needs your check" notes. */
export function reviewCalcChecks(raw: unknown, opts: { enabled?: boolean } = {}): CalcReviewResult {
  const empty: CalcReviewResult = { review: [], needsCheck: [] };
  if (opts.enabled === false || !Array.isArray(raw)) return empty;

  const review: CalcReview[] = [];
  const needsCheck: NeedsCheck[] = [];

  for (const item of raw.slice(0, MAX_CHECKS)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const expression = String(o.expression ?? "").trim();
    if (!expression) continue;
    const location = String(o.location ?? "").trim().slice(0, 80) || "A calculation";
    const what = String(o.what ?? "").trim().slice(0, 160);
    const claimed = num(o.claimed_correct);
    const student = num(o.student_answer);

    let computed: number | null = null;
    try {
      computed = evaluateExpression(expression);
    } catch {
      computed = null;
    }

    let status: CalcStatus;
    if (computed === null || claimed === null) status = "unverified";
    else status = closeEnough(computed, claimed) ? "confirmed" : "mismatch";

    review.push({ location, what, expression: expression.slice(0, MAX_EXPR), computed, claimed, student, status });

    if (status === "mismatch" && computed !== null && claimed !== null) {
      needsCheck.push({
        location,
        reason: `We recalculated this and got ${short(computed)}, not ${short(claimed)}. Treat the grade for this item as uncertain and check it yourself.`,
      });
    }
  }
  return { review, needsCheck };
}

// ---------------------------------------------------------------------------
// Turning a confirmed wrong final answer into an actual score correction.
// ---------------------------------------------------------------------------

import type { GradeResult, Section } from "./schema";
import { percentFromSections, letterForPercent, estimatedRange, round } from "./grade-math";

/** "Question 2", "Q2", "question #2" -> "2". Null when no question number is present. */
function questionNumber(s: string): string | null {
  const m = /\bq(?:uestion)?\s*#?\s*(\d+)\b/i.exec(s);
  return m ? m[1] : null;
}

/** True when a section's name plainly spans more than one question (so a single-item correction shouldn't touch it). */
function spansMultipleQuestions(name: string): boolean {
  return /\bquestions?\s*\d+\s*(?:[-–,]|and|through|to)\s*\d+/i.test(name) || /\d+\s*[-–]\s*\d+/.test(name);
}

/** A section given credit despite a confirmed-wrong final answer gets capped, never raised. */
const WRONG_ANSWER_MAX_RATIO_WITH_PARTIAL_CREDIT = 0.4;
const WRONG_ANSWER_MAX_RATIO_NO_PARTIAL_CREDIT = 0;
/** Only step in when the model gave more credit than that cap already implies. */
const CORRECTION_TRIGGER_RATIO = 0.6;

/**
 * The model can write an internally consistent-looking `calc_checks` entry
 * (correctly computing the right answer) while separately grading that same
 * question as fully correct in `sections`, a self-contradiction inside one
 * response. This cross-checks the two and corrects the section's points
 * when the student's own final answer is confirmed wrong (real arithmetic,
 * not a judgment call), then recomputes the overall score from the correction.
 *
 * Deliberately conservative: only touches a section that (a) matches a
 * calc_review item by question number and (b) plainly covers just that one
 * question, never a merged "Questions 1-3" section. Never used for English.
 */
export function applyCalcCorrections(
  result: GradeResult,
  review: CalcReview[],
  opts: { partialCreditAllowed: boolean },
): GradeResult {
  const wrongItems = review.filter(
    (r) => r.computed !== null && r.student !== null && !closeEnough(r.computed, r.student),
  );
  if (wrongItems.length === 0) return result;

  const cap = opts.partialCreditAllowed
    ? WRONG_ANSWER_MAX_RATIO_WITH_PARTIAL_CREDIT
    : WRONG_ANSWER_MAX_RATIO_NO_PARTIAL_CREDIT;

  let corrected = false;
  const sections: Section[] = result.sections.map((s) => {
    if (s.points_possible <= 0 || spansMultipleQuestions(s.name)) return s;
    const ratio = s.points_earned / s.points_possible;
    if (ratio < CORRECTION_TRIGGER_RATIO) return s;

    const sectionQ = questionNumber(s.name);
    if (!sectionQ) return s;
    const hit = wrongItems.find((w) => questionNumber(w.location) === sectionQ);
    if (!hit) return s;
    if (ratio <= cap) return s; // already at or below the corrected ceiling

    corrected = true;
    const points_earned = round(s.points_possible * cap, 1);
    return {
      ...s,
      points_earned,
      feedback: `We recomputed this and the correct answer is ${short(hit.computed!)}, not ${short(hit.student!)}. Credit was adjusted for the wrong final answer.`,
    };
  });

  if (!corrected) return result;

  const score = round(percentFromSections(sections) ?? result.score);
  const range = estimatedRange(score, result.inferred_rubric);
  const note = "One or more answers were rescored after independently re-checking the arithmetic.";
  return {
    ...result,
    sections,
    score,
    letter_grade: letterForPercent(score),
    estimated_range_low: range.low,
    estimated_range_high: range.high,
    grading_basis_note: result.grading_basis_note ? `${result.grading_basis_note} ${note}` : note,
  };
}
