import type { Subject } from "@/lib/grading/subjects";

/**
 * Per-grade input limits, by subject. They keep one pathological upload from
 * blowing up LLM cost and are enforced both in the uploader UI and,
 * authoritatively, in /api/grade. Pasted text counts toward the text limit
 * together with text extracted from uploaded files.
 *
 * English is mostly typed text, Math is mostly photos of handwritten work,
 * Science sits in between. Starting values: tune from real usage.
 */
export interface SubjectLimits {
  maxMaterialFiles: number;
  maxWorkFiles: number;
  /** Total characters across all pasted and extracted text (materials + work). */
  maxTextChars: number;
}

export const SUBJECT_LIMITS: Record<Subject, SubjectLimits> = {
  english: { maxMaterialFiles: 5, maxWorkFiles: 5, maxTextChars: 150_000 },
  math: { maxMaterialFiles: 3, maxWorkFiles: 8, maxTextChars: 40_000 },
  science: { maxMaterialFiles: 5, maxWorkFiles: 6, maxTextChars: 100_000 },
};

export function limitsFor(subject: Subject): SubjectLimits {
  return SUBJECT_LIMITS[subject];
}

/** Student-facing message when the combined text is over the limit, else null. */
export function textLimitError(totalChars: number, maxChars: number): string | null {
  if (totalChars <= maxChars) return null;
  return `That's too much text (${totalChars.toLocaleString()} characters). The limit is ${maxChars.toLocaleString()} across everything you paste or upload. Try trimming it down.`;
}
