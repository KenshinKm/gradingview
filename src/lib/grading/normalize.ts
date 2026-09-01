import {
  gradeResultSchema,
  rawModelOutputSchema,
  scoringBasisSchema,
  DISCLAIMER,
  type GradeResult,
  type ScoringBasis,
} from "./schema";
import {
  clampPercent,
  estimatedRange,
  letterForPercent,
  percentFromSections,
  round,
} from "./grade-math";

export class GradingValidationError extends Error {
  constructor(
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "GradingValidationError";
  }
}

export interface UnreadableImage {
  label: string;
  reason: string;
}

/**
 * Raised when the model reports it cannot reliably read one or more attached
 * images. The grading attempt must fail WITHOUT consuming a usage credit and
 * the student is asked to retake the photo(s).
 */
export class UnreadableImageError extends Error {
  constructor(public readonly images: UnreadableImage[]) {
    super("One or more uploaded images could not be read reliably.");
    this.name = "UnreadableImageError";
  }

  /** Friendly, student-facing message naming the pages to replace. */
  get studentMessage(): string {
    if (this.images.length === 0) {
      return "We're having trouble reading one of your photos. Retake it in good lighting with the whole page visible.";
    }
    const parts = this.images.slice(0, 4).map((i) => {
      const where = i.label.replace(/^Your work —\s*/i, "").replace(/:$/, "").trim();
      const label = where || "one page";
      return i.reason
        ? `${cap(label)} — ${i.reason}`
        : `${cap(label)} couldn't be read`;
    });
    return `We're having trouble reading ${parts.join("; ")}. Retake the photo(s) in good lighting with the full page visible, then grade again.`;
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * If the model returned an `unreadable_images` report instead of a grade,
 * throw an UnreadableImageError. Call this on the parsed JSON before
 * `normalizeResult`.
 */
export function checkUnreadable(input: unknown): void {
  if (!input || typeof input !== "object") return;
  const rec = input as Record<string, unknown>;
  const raw = rec.unreadable_images ?? rec.unreadableImages;
  if (!Array.isArray(raw) || raw.length === 0) return;
  const images: UnreadableImage[] = raw.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      label: String(o.label ?? o.page ?? o.image ?? "").trim(),
      reason: String(o.reason ?? o.issue ?? "").trim(),
    };
  });
  throw new UnreadableImageError(images);
}

/** Extract the first JSON object from a model response (tolerates code fences / prose). */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new GradingValidationError("No JSON object found in model output");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (err) {
    throw new GradingValidationError("Model output was not valid JSON", err);
  }
}

function coerceBasis(v: unknown): ScoringBasis | null {
  const parsed = scoringBasisSchema.safeParse(v);
  return parsed.success ? parsed.data : null;
}

/**
 * Normalize a raw model object into a fully-valid GradeResult.
 * - Recomputes the percentage from graded sections when possible (authoritative).
 * - Recomputes the letter grade from the final percentage.
 * - Derives an overall scoring_basis from the sections when the model omits it.
 * - Fills a defensible estimated range if missing or nonsensical.
 * Throws GradingValidationError if the shape is unrecoverable.
 */
export function normalizeResult(input: unknown): GradeResult {
  const parsed = rawModelOutputSchema.safeParse(input);
  if (!parsed.success) {
    throw new GradingValidationError(
      "Model output did not match expected schema",
      parsed.error.flatten(),
    );
  }
  const raw = parsed.data;

  const rawSections = raw.sections ?? raw.rubric_categories ?? [];
  const sections = rawSections.map((c) => {
    const basis =
      coerceBasis(c.scoring_basis) ?? coerceBasis(raw.scoring_basis) ?? "ai_inferred";
    return {
      name: String(c.name),
      kind: c.kind ? String(c.kind) : undefined,
      points_earned: Math.max(0, Number(c.points_earned) || 0),
      points_possible: Math.max(0, Number(c.points_possible) || 0),
      scoring_basis: basis,
      feedback: String(c.feedback || "No section feedback provided."),
    };
  });

  // Overall scoring basis: model value, else derived from sections.
  let overallBasis = coerceBasis(raw.scoring_basis);
  if (!overallBasis) {
    const set = new Set(sections.map((s) => s.scoring_basis));
    if (set.size === 0) overallBasis = "ai_inferred";
    else if (set.size === 1) overallBasis = [...set][0];
    else overallBasis = "mixed";
  }

  const inferred =
    typeof raw.inferred_rubric === "boolean"
      ? raw.inferred_rubric
      : overallBasis === "ai_inferred" ||
        overallBasis === "mixed" ||
        sections.some((s) => s.scoring_basis === "ai_inferred");

  // Percentage: prefer the section math; fall back to the model's stated score.
  const fromSections = percentFromSections(sections);
  let score =
    fromSections ??
    (typeof raw.score === "number" ? clampPercent(raw.score) : NaN);
  if (Number.isNaN(score)) {
    throw new GradingValidationError("Could not determine a score");
  }
  score = round(score);

  const letter = letterForPercent(score);

  let low = typeof raw.estimated_range_low === "number" ? raw.estimated_range_low : NaN;
  let high =
    typeof raw.estimated_range_high === "number" ? raw.estimated_range_high : NaN;
  if (
    Number.isNaN(low) ||
    Number.isNaN(high) ||
    low > score ||
    high < score ||
    high < low ||
    high - low > 25
  ) {
    const r = estimatedRange(score, inferred);
    low = r.low;
    high = r.high;
  }
  low = round(clampPercent(low));
  high = round(clampPercent(high));

  const thingsToFix = (raw.things_to_fix ?? [])
    .map((t, i) => ({
      priority: Number(t.priority) || i + 1,
      title: String(t.title || "Improvement"),
      explanation: String(t.explanation || ""),
      location: String(t.location || "General"),
      suggestion: String(t.suggestion || ""),
    }))
    .filter((t) => t.explanation && t.suggestion)
    .sort((a, b) => a.priority - b.priority)
    .map((t, i) => ({ ...t, priority: i + 1 }))
    .slice(0, 9);

  if (thingsToFix.length === 0) {
    throw new GradingValidationError("Model returned no actionable fixes");
  }

  const writtenResponseFeedback = (raw.written_response_feedback ?? [])
    .map((w) => ({
      label: String(w.label || "Response"),
      points_earned: Math.max(0, Number(w.points_earned) || 0),
      points_possible: Math.max(0, Number(w.points_possible) || 0),
      why_points_lost: String(w.why_points_lost || ""),
      how_to_improve: String(w.how_to_improve || ""),
    }))
    .filter((w) => w.why_points_lost || w.how_to_improve);

  const result: GradeResult = {
    score,
    letter_grade: letter,
    estimated_range_low: low,
    estimated_range_high: high,
    scoring_basis: overallBasis,
    inferred_rubric: inferred,
    grading_basis_note: String(raw.grading_basis_note || ""),
    sections,
    written_response_feedback: writtenResponseFeedback,
    things_to_fix: thingsToFix,
    strengths: (raw.strengths ?? [])
      .map((s) => ({
        title: String(s.title || "Strength"),
        explanation: String(s.explanation || ""),
      }))
      .filter((s) => s.explanation),
    grammar_or_citation_issues: (raw.grammar_or_citation_issues ?? [])
      .map((g) => ({
        type: String(g.type || "Issue"),
        location: String(g.location || "General"),
        explanation: String(g.explanation || ""),
      }))
      .filter((g) => g.explanation),
    overall_feedback: String(raw.overall_feedback || "").trim(),
    disclaimer: DISCLAIMER,
  };

  if (!result.overall_feedback) {
    throw new GradingValidationError("Model returned no overall feedback");
  }

  const finalCheck = gradeResultSchema.safeParse(result);
  if (!finalCheck.success) {
    throw new GradingValidationError(
      "Normalized result failed validation",
      finalCheck.error.flatten(),
    );
  }
  return finalCheck.data;
}
