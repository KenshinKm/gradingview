import { NextResponse, after, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEntitlement } from "@/lib/entitlements";
import { clientIpHash } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { loadAttemptWorkImages, loadPriorMaterialImages } from "@/lib/uploads";
import { runGradingJob } from "@/lib/grading/job";
import { STALE_PROCESSING_MS } from "@/lib/grading/timing";
import { parseLevel, parseSubject } from "@/lib/grading/subjects";
import { isSubjectEnabled } from "@/lib/subject-config";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Retry {
  subject?: string;
  level?: string;
  options?: Record<string, unknown>;
  title?: string | null;
  course?: string | null;
  citationStyle?: string | null;
}

/**
 * "Grade it anyway" after a mismatch warning. Re-runs the SAME attempt on the
 * files that are already saved, so the student doesn't upload anything again.
 * Still charged only if the grade finishes.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });

  const rl = rateLimit(`grade:${user.id}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: `Too many requests. Try again in ${rl.retryAfterSec}s.` }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { attemptId?: string };
  const attemptId = String(body.attemptId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) {
    return NextResponse.json({ error: "Bad attempt id." }, { status: 400 });
  }

  const entitlement = await getEntitlement(user.id);
  if (!entitlement.canGrade) {
    return NextResponse.json(
      { error: "Grading isn't available on your plan right now.", code: entitlement.blockReason ?? "not_entitled" },
      { status: 402 },
    );
  }

  const admin = createSupabaseAdminClient();

  const since = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { count } = await admin
    .from("grading_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "processing")
    .gte("created_at", since);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "You already have a grade in progress. Wait for it to finish.", code: "already_grading" },
      { status: 409 },
    );
  }

  const { data: attempt } = await admin
    .from("grading_attempts")
    .select("id, user_id, assignment_id, draft_number, work_text, status, result")
    .eq("id", attemptId)
    .maybeSingle();
  const blocked = (attempt?.result as { blocked?: { code?: string; retry?: Retry } } | null)?.blocked;
  if (
    !attempt ||
    attempt.user_id !== user.id ||
    attempt.status !== "failed" ||
    blocked?.code !== "context_mismatch"
  ) {
    return NextResponse.json({ error: "This grade can't be confirmed." }, { status: 400 });
  }

  const retry = blocked.retry ?? {};
  const subject = parseSubject(retry.subject);
  if (!isSubjectEnabled(subject)) {
    return NextResponse.json({ error: "That subject isn't available yet.", code: "subject_disabled" }, { status: 400 });
  }

  const { data: assignment } = await admin
    .from("assignments")
    .select("grading_materials_text, title, course, citation_style")
    .eq("id", attempt.assignment_id)
    .single();

  const [materialImages, workImages] = await Promise.all([
    loadPriorMaterialImages(attempt.assignment_id),
    loadAttemptWorkImages(attempt.id),
  ]);

  // Put the same attempt back to work. A fresh start time keeps the stale-attempt clock honest.
  const { error: resetError } = await admin
    .from("grading_attempts")
    .update({ status: "processing", error_message: null, result: null, created_at: new Date().toISOString() })
    .eq("id", attempt.id)
    .eq("status", "failed");
  if (resetError) return NextResponse.json({ error: "Could not restart grading." }, { status: 500 });

  after(
    runGradingJob({
      attemptId: attempt.id,
      userId: user.id,
      draftNumber: attempt.draft_number,
      entitlement,
      ipHash: clientIpHash(req.headers),
      grade: {
        gradingMaterialsText: assignment?.grading_materials_text ?? "",
        workText: attempt.work_text ?? "",
        assignmentTitle: retry.title ?? assignment?.title ?? null,
        course: retry.course ?? assignment?.course ?? null,
        citationStyle: retry.citationStyle ?? assignment?.citation_style ?? null,
        materialImages,
        workImages,
        subject,
        level: parseLevel(retry.level),
        contextConfirmed: true,
        options: (retry.options ?? {}) as never,
      },
    }),
  );

  return NextResponse.json({ attemptId: attempt.id }, { status: 202 });
}
