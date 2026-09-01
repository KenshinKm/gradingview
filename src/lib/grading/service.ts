import "server-only";
import { callLlm, type ImagePart } from "./llm";
import { SYSTEM_PROMPT, buildUserPrompt, type GradingInput } from "./prompt";
import {
  extractJson,
  normalizeResult,
  GradingValidationError,
} from "./normalize";
import type { GradeResult } from "./schema";

export interface GradeSubmissionArgs extends GradingInput {
  /** Grading-material images, in user-defined order. */
  materialImages?: ImagePart[];
  /** "Your work" page images, in user-defined order. */
  workImages?: ImagePart[];
}

export interface GradeSubmissionResult {
  result: GradeResult;
  model: string;
}

/**
 * Core grading entrypoint. Calls the configured LLM, validates the structured
 * output, and retries once with a stricter instruction on malformed output.
 * Throws on unrecoverable failure — callers must NOT record usage in that case.
 */
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

  const system = SYSTEM_PROMPT;
  const baseUser = buildUserPrompt({
    ...args,
    materialImageCount: materialImages.length,
    workImageCount: workImages.length,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? baseUser
        : `${baseUser}\n\nIMPORTANT: Your previous response could not be parsed. Reply with ONLY the raw JSON object, no markdown, no commentary.`;

    let text: string;
    let model: string;
    try {
      const res = await callLlm({ system, user, images });
      text = res.text;
      model = res.model;
    } catch (err) {
      lastError = err;
      continue;
    }

    try {
      const json = extractJson(text);
      const result = normalizeResult(json);
      return { result, model };
    } catch (err) {
      lastError = err;
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
