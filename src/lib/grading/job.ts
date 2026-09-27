import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recordUsage, type Entitlement } from "@/lib/entitlements";
import { track } from "@/lib/analytics";
import { gradeSubmission, type GradeSubmissionArgs } from "./service";
import { GRADE_TIMEOUT_MS } from "./timing";
import { isEmptyPartial, parsePartial, partialSignature } from "./partial";
import { costThresholdsFromEnv, evaluateCost, monthStartIso, sumCosts } from "@/lib/cost-watch";
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
  const live = livePartialWriter(p.attemptId);
  try {
    const { result } = await withTimeout(
      gradeSubmission({ ...p.grade, onText: live.onText }),
      GRADE_TIMEOUT_MS,
    );
    live.stop();

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

    await watchCost(p.userId, p.attemptId, result.usage?.cost_usd);

    track("grading_completed", { draft: p.draftNumber, score: result.score });
    if (p.entitlement.plan === "free") track("free_grade_used");
  } catch (err) {
    live.stop();
    // The work clearly doesn't match: ask, do NOT charge. Details go in `result`
    // so the form (or a returning student) can show the right prompt.
    if (err instanceof ContextMismatchError) {
      await fail(p.attemptId, err.studentMessage, {
        // `retry` lets the student confirm and grade again without re-uploading.
        blocked: { code: "context_mismatch", mismatch: err.mismatch, retry: retryParams(p) },
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

/** Everything needed to run the same grade again after the student confirms. */
function retryParams(p: GradingJobParams) {
  const g = p.grade;
  return {
    subject: g.subject ?? "english",
    level: g.level ?? "unspecified",
    options: g.options ?? {},
    title: g.assignmentTitle ?? null,
    course: g.course ?? null,
    workType: g.workType ?? null,
    citationStyle: g.citationStyle ?? null,
  };
}

/**
 * Saves what the model has written so far onto the attempt (at most every
 * ~0.6s, only when something new is complete) so the results page can show it.
 * Writes never block grading and only apply while the attempt is processing.
 */
function livePartialWriter(attemptId: string) {
  const admin = createSupabaseAdminClient();
  let lastAt = 0;
  let lastSig = "";
  let inFlight = false;
  let stopped = false;

  function onText(text: string) {
    const now = Date.now();
    if (stopped || inFlight || now - lastAt < 600) return;
    const partial = parsePartial(text);
    if (isEmptyPartial(partial)) return;
    const sig = partialSignature(partial);
    if (sig === lastSig) return;
    lastAt = now;
    lastSig = sig;
    inFlight = true;
    void Promise.resolve(
      admin
        .from("grading_attempts")
        .update({ result: { partial } })
        .eq("id", attemptId)
        .eq("status", "processing"),
    )
      .catch(() => {})
      .finally(() => {
        inFlight = false;
      });
  }

  return {
    onText,
    stop() {
      stopped = true;
    },
  };
}

/** Logs a "[cost-alert]" line when this grade or the student's month is unusually expensive. */
async function watchCost(userId: string, attemptId: string, gradeUsd: number | null | undefined) {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("grading_attempts")
      .select("cost:result->usage->>cost_usd")
      .eq("user_id", userId)
      .eq("status", "complete")
      .gte("created_at", monthStartIso());
    const monthUsd = sumCosts((data ?? []) as unknown as Array<{ cost: unknown }>);
    for (const a of evaluateCost(gradeUsd, monthUsd, costThresholdsFromEnv())) {
      console.warn(`[cost-alert] ${a.kind}: ${a.message}`, { userId, attemptId });
    }
  } catch (e) {
    // Monitoring must never affect the student's grade.
    console.error("cost watch failed", e);
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
