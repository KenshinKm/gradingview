import type { Subject } from "./subjects";

export type Effort = "low" | "medium" | "high";

/**
 * How hard the model thinks before writing. English uses the model's default.
 * Math and Science use "medium": on a test paper with planted mistakes it
 * caught the same errors as "high" about 28% faster. Override per subject with
 * LLM_EFFORT_MATH / LLM_EFFORT_SCIENCE / LLM_EFFORT_ENGLISH (low, medium, high).
 */
const DEFAULTS: Record<Subject, Effort | undefined> = {
  english: undefined,
  math: "medium",
  science: "medium",
};

export function effortFor(
  subject: Subject,
  env: Record<string, string | undefined> = process.env,
): Effort | undefined {
  const v = env[`LLM_EFFORT_${subject.toUpperCase()}`]?.trim().toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return DEFAULTS[subject];
}
