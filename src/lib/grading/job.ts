import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordUsage, type Entitlement } from "@/lib/entitlements";
import { track } from "@/lib/analytics";
import { gradeSubmission, type GradeSubmissionArgs } from "./service";
import { GRADE_TIMEOUT_MS } from "./timing";
import { ContextMismatchError, UnreadableImageError } from "./normalize";

export interface GradingJobParams {
  attemptId: string;
  userId: string;
  draftNumber: number;
  entitlement: Entitlement;
  ipHash: string | null;
  grade: GradeSubmissionArgs;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Grading timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Runs one grade to completion and records the outcome on the attempt row.
 * Runs after the HTTP response has been sent, so it keeps going if the student
 * closes the tab. A credit is recorded ONLY after a valid result is saved.
 * Never throws: every path ends with the attempt marked complete or failed.
 */
export async function runGradingJob(p: GradingJobParams): Promise<void> {
  const admin = createSupabaseAdminClient();
  try {
    const { result } = await withTimeout(gradeSubmission(p.grade), GRADE_TIMEOUT_MS);

    const { error: saveError } = await admin
      .from("grading_attempts")
      .update({
        status: "complete",
        score: result.score,
        letter_grade: result.letter_grade,
        estimated_range_low: result.estimated_range_low,
        estimated_range_high: result.estimated_range_high,
        scoring_basis: result.scoring_basis,
        result,
        inferred_rubric: result.inferred_rubric,
        completed_at: new Date().toISOString(),
      })
      .eq("id", p.attemptId);
    if (saveError) throw new Error(`Could not save the result: ${saveError.message}`);

    // Charge ONLY after a successful, valid, persisted result.
    await recordUsage(p.userId, p.attemptId, p.entitlement, p.ipHash);

    track("grading_completed", { draft: p.draftNumber, score: result.score });
    if (p.entitlement.plan === "free") track("free_grade_used");
  } catch (err) {
    // The work clearly doesn't match: ask, do NOT charge. Details go in `result`
    // so the form (or a returning student) can show the right prompt.
    if (err instanceof ContextMismatchError) {
      await fail(p.attemptId, err.studentMessage, {
        blocked: { code: "context_mismatch", mismatch: err.mismatch },
      });
      return;
    }
    if (err instanceof UnreadableImageError) {
      await fail(p.attemptId, err.studentMessage, {
        blocked: { code: "unreadable_image", images: err.images },
      });
      return;
    }
    console.error("grading job failed", p.attemptId, err);
    await fail(
      p.attemptId,
      "We couldn't finish grading this submission. Your credit was not used. Please try again.",
      { blocked: { code: "grading_failed" } },
      (err as Error).message,
    );
  }
}

async function fail(
  attemptId: string,
  message: string,
  result: Record<string, unknown>,
  detail?: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin
      .from("grading_attempts")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        result: detail ? { ...result, detail: detail.slice(0, 300) } : result,
      })
      .eq("id", attemptId);
  } catch (e) {
    console.error("could not mark attempt failed", attemptId, e);
  }
}
