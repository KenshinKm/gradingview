import "server-only";
import { callLlm, type ImagePart } from "./llm";
import { buildSystemPrompt, buildUserPrompt, type GradingInput } from "./prompt";
import {
  extractJson,
  normalizeResult,
  checkUnreadable,
  checkContextMismatch,
  ContextMismatchError,
  GradingValidationError,
  UnreadableImageError,
} from "./normalize";
import type { GradeResult, GradeUsage } from "./schema";
import { estimateCostUsd } from "@/lib/llm-cost";
import { LEVEL_LABEL, SUBJECT_LABEL } from "./subjects";
import { reviewCalcChecks, applyCalcCorrections } from "./calc-check";
import { effortFor, type Effort, type Reasoning } from "./effort";

export interface GradeSubmissionArgs extends GradingInput {
  /** Grading-material images, in user-defined order. */
  materialImages?: ImagePart[];
  /** "Your work" page images, in user-defined order. */
  workImages?: ImagePart[];
  /** Called with the model's answer so far while it streams in. */
  onText?: (textSoFar: string) => void;
  /** Overrides the per-subject default thinking effort (used by stress tests). */
  effort?: "low" | "medium" | "high";
  /** Skips the thinking phase (stress tests / experiments). */
  thinking?: "off";
}

export interface GradeSubmissionResult {
  result: GradeResult;
  model: string;
  usage: GradeUsage;
}

/**
 * Core grading entrypoint. Calls the configured LLM, validates the structured
 * output, and retries once with a stricter instruction on malformed output.
 * Throws on unrecoverable failure — callers must NOT record usage in that case.
 */
/** Maps the chosen reasoning level (explicit override, else per-subject default) to LLM options. */
function reasoningParams(args: GradeSubmissionArgs): { effort?: Effort; thinking?: "off" } {
  const r: Reasoning | undefined = args.thinking === "off" ? "off" : (args.effort ?? effortFor(args.subject ?? "english"));
  if (r === "off") return { thinking: "off" };
  return r ? { effort: r } : {};
}

export async function gradeSubmission(
  args: GradeSubmissionArgs,
): Promise<GradeSubmissionResult> {
  const materialImages = (args.materialImages ?? []).map((img, i) => ({
    ...img,
    label: `Grading material image ${i + 1} of ${args.materialImages!.length}:`,
  }));
  const workImages = (args.workImages ?? []).map((img, i) => ({
    ...img,
    label: `Your work — page ${i + 1} of ${args.workImages!.length}:`,
  }));
  const images: ImagePart[] = [...materialImages, ...workImages];

  const system = buildSystemPrompt(args.subject ?? "english", {
    contextConfirmed: args.contextConfirmed,
  });
  const baseUser = buildUserPrompt({
    ...args,
    materialImageCount: materialImages.length,
    workImageCount: workImages.length,
  });

  let lastError: unknown;
  let inputTokens = 0;
  let outputTokens = 0;
  let calls = 0;
  let usedModel = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? baseUser
        : `${baseUser}\n\nIMPORTANT: Your previous response could not be parsed. Reply with ONLY the raw JSON object, no markdown, no commentary.`;

    let text: string;
    let model: string;
    try {
      const res = await callLlm({
        system,
        user,
        images,
        onText: args.onText,
        ...reasoningParams(args),
      });
      text = res.text;
      model = res.model;
      calls += 1;
      usedModel = res.model;
      inputTokens += res.usage?.input_tokens ?? 0;
      outputTokens += res.usage?.output_tokens ?? 0;
    } catch (err) {
      lastError = err;
      continue;
    }

    try {
      const json = extractJson(text);
      // The model reports unreadable images instead of a grade — do not retry,
      // do not guess; surface it so the caller can ask for better photos.
      checkUnreadable(json);
      checkContextMismatch(json);
      let result = normalizeResult(json);

      const subject = args.subject ?? "english";
      const level = args.level ?? "unspecified";
      // The student's own selections are authoritative in the summary.
      if (result.understood) {
        result.understood.subject = SUBJECT_LABEL[subject];
        result.understood.subject_code = subject;
        result.understood.level_code = level;
        if (level !== "unspecified") result.understood.level = LEVEL_LABEL[level];
      }
      // Math and Science: re-run the grader's arithmetic ourselves.
      if (subject !== "english") {
        const { review, needsCheck } = reviewCalcChecks(
          (json as Record<string, unknown>).calc_checks,
          { enabled: args.options?.checkCalculations !== false },
        );
        if (review.length > 0) {
          // Correct the score BEFORE attaching calc_review, so the summary shown
          // to the student reflects the same numbers as the sections below it.
          result = applyCalcCorrections(result, review, {
            partialCreditAllowed: args.options?.partialCredit !== false,
          });
          result.calc_review = review;
        }
        if (needsCheck.length > 0) {
          result.needs_check = [...(result.needs_check ?? []), ...needsCheck].slice(0, 6);
        }
      }
      const usage: GradeUsage = {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        calls,
        model: usedModel,
        cost_usd: estimateCostUsd(usedModel, {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        }),
      };
      result.usage = usage;
      return { result, model, usage };
    } catch (err) {
      lastError = err;
      if (err instanceof UnreadableImageError || err instanceof ContextMismatchError) throw err;
      if (!(err instanceof GradingValidationError)) throw err;
    }
  }

  throw new GradingValidationError(
    "The grading model did not return a usable result. Please try again.",
    lastError,
  );
}

/** @deprecated use {@link gradeSubmission} */
export const gradeEssay = gradeSubmission;
