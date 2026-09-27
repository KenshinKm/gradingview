import type { Subject } from "./subjects";

export type Effort = "low" | "medium" | "high";
/** "off" skips the thinking phase entirely: results start streaming immediately. */
export type Reasoning = Effort | "off";

/**
 * How much the model thinks before it writes. English uses the model's default,
 * Math runs on "low" and Science on "medium". Measured on a real Algebra 2
 * paper: high took 109s, medium 61s, low about 28s, off about 25s. Override per
 * subject with LLM_EFFORT_MATH / LLM_EFFORT_SCIENCE / LLM_EFFORT_ENGLISH set to
 * off, low, medium or high.
 */
const DEFAULTS: Record<Subject, Reasoning | undefined> = {
  english: undefined,
  math: "low",
  science: "medium",
};

export function effortFor(
  subject: Subject,
  env: Record<string, string | undefined> = process.env,
): Reasoning | undefined {
  const v = env[`LLM_EFFORT_${subject.toUpperCase()}`]?.trim().toLowerCase();
  if (v === "off" || v === "low" || v === "medium" || v === "high") return v;
  return DEFAULTS[subject];
}
