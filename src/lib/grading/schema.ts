import { z } from "zod";

export const DISCLAIMER =
  "This is a rough estimate based on the grading materials and work you provided. GradingView can make mistakes, and your instructor's actual grade may differ.";

/** How a score was arrived at. */
export const scoringBasisSchema = z.enum([
  "rubric",
  "answer_key",
  "ai_inferred",
  "mixed",
]);
export type ScoringBasis = z.infer<typeof scoringBasisSchema>;

/**
 * A graded section of the submission. Works for rubric categories
 * ("Argument / Thesis"), format sections ("Multiple Choice"), or a single
 * inferred bucket when no structure was provided.
 */
export const sectionSchema = z.object({
  name: z.string().min(1),
  /** Optional format hint: "multiple_choice" | "short_answer" | "essay" | "rubric_category" | "other" */
  kind: z.string().optional(),
  points_earned: z.number().min(0),
  points_possible: z.number().min(0),
  scoring_basis: scoringBasisSchema,
  feedback: z.string().min(1),
});

export const thingToFixSchema = z.object({
  priority: z.number().int().min(1),
  title: z.string().min(1),
  explanation: z.string().min(1),
  location: z.string().min(1),
  suggestion: z.string().min(1),
});

export const strengthSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
});

export const grammarIssueSchema = z.object({
  type: z.string().min(1),
  location: z.string().min(1),
  explanation: z.string().min(1),
});

/** Detailed feedback on a single written response (short/long answer). */
export const writtenResponseFeedbackSchema = z.object({
  label: z.string().min(1),
  points_earned: z.number().min(0),
  points_possible: z.number().min(0),
  why_points_lost: z.string().min(1),
  how_to_improve: z.string().min(1),
});

export const gradeResultSchema = z.object({
  score: z.number().min(0).max(100),
  letter_grade: z.string().min(1).max(3),
  estimated_range_low: z.number().min(0).max(100),
  estimated_range_high: z.number().min(0).max(100),
  /**
   * Overall basis for the estimate:
   *  - "rubric": an explicit rubric drove scoring
   *  - "answer_key": a provided answer key drove scoring
   *  - "ai_inferred": no rubric/key — criteria & correctness were inferred
   *  - "mixed": a combination across sections
   */
  scoring_basis: scoringBasisSchema,
  /** True when any part of scoring had to be inferred without a rubric or key. */
  inferred_rubric: z.boolean(),
  /** Human summary of what the grading materials specified (or that they were thin). */
  grading_basis_note: z.string().optional().default(""),
  sections: z.array(sectionSchema),
  written_response_feedback: z.array(writtenResponseFeedbackSchema).default([]),
  things_to_fix: z.array(thingToFixSchema).min(1).max(9),
  strengths: z.array(strengthSchema),
  grammar_or_citation_issues: z.array(grammarIssueSchema),
  overall_feedback: z.string().min(1),
  disclaimer: z.string().min(1),
});

export type Section = z.infer<typeof sectionSchema>;
export type ThingToFix = z.infer<typeof thingToFixSchema>;
export type Strength = z.infer<typeof strengthSchema>;
export type GrammarIssue = z.infer<typeof grammarIssueSchema>;
export type WrittenResponseFeedback = z.infer<typeof writtenResponseFeedbackSchema>;
export type GradeResult = z.infer<typeof gradeResultSchema>;

/**
 * The raw model output schema — deliberately loose. The model may return a
 * wrong score, a wrong letter, or omit derived fields; `normalizeResult`
 * recomputes and revalidates against `gradeResultSchema`.
 */
export const rawModelOutputSchema = z
  .object({
    score: z.number().optional(),
    letter_grade: z.string().optional(),
    estimated_range_low: z.number().optional(),
    estimated_range_high: z.number().optional(),
    scoring_basis: z.string().optional(),
    inferred_rubric: z.boolean().optional(),
    grading_basis_note: z.string().optional().default(""),
    // Accept both the new "sections" and the legacy "rubric_categories".
    sections: z
      .array(
        z.object({
          name: z.string(),
          kind: z.string().optional(),
          points_earned: z.coerce.number(),
          points_possible: z.coerce.number(),
          scoring_basis: z.string().optional(),
          feedback: z.string().optional().default(""),
        }),
      )
      .optional(),
    rubric_categories: z
      .array(
        z.object({
          name: z.string(),
          kind: z.string().optional(),
          points_earned: z.coerce.number(),
          points_possible: z.coerce.number(),
          scoring_basis: z.string().optional(),
          feedback: z.string().optional().default(""),
        }),
      )
      .optional(),
    written_response_feedback: z
      .array(
        z.object({
          label: z.string().optional().default(""),
          points_earned: z.coerce.number().optional(),
          points_possible: z.coerce.number().optional(),
          why_points_lost: z.string().optional().default(""),
          how_to_improve: z.string().optional().default(""),
        }),
      )
      .default([]),
    things_to_fix: z
      .array(
        z.object({
          priority: z.coerce.number().optional(),
          title: z.string().optional().default(""),
          explanation: z.string().optional().default(""),
          location: z.string().optional().default(""),
          suggestion: z.string().optional().default(""),
        }),
      )
      .default([]),
    strengths: z
      .array(
        z.object({
          title: z.string().optional().default(""),
          explanation: z.string().optional().default(""),
        }),
      )
      .default([]),
    grammar_or_citation_issues: z
      .array(
        z.object({
          type: z.string().optional().default(""),
          location: z.string().optional().default(""),
          explanation: z.string().optional().default(""),
        }),
      )
      .default([]),
    overall_feedback: z.string().optional().default(""),
    disclaimer: z.string().optional(),
  })
  .passthrough();
