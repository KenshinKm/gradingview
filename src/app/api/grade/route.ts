import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getEntitlement,
  recordUsage,
  countRecentFreeGradesByIp,
} from "@/lib/entitlements";
import { clientIpHash } from "@/lib/client-ip";
import { isFreeGradeIpBlocked } from "@/lib/free-grade-ip";
import { rateLimit } from "@/lib/rate-limit";
import { processUpload, loadPriorMaterialImages } from "@/lib/uploads";
import { MAX_FILES_PER_SECTION } from "@/lib/upload-limits";
import { gradeSubmission } from "@/lib/grading/service";
import { UnreadableImageError } from "@/lib/grading/normalize";
import type { ImagePart } from "@/lib/grading/llm";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 120;

const CITATION_STYLES = new Set(["not_specified", "mla", "apa", "chicago", "other"]);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  }

  const rl = rateLimit(`grade:${user.id}`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const ipHash = clientIpHash(req.headers);

  // ---------- entitlement (server-authoritative) ----------
  const entitlement = await getEntitlement(user.id);
  if (!entitlement.canGrade) {
    track("paywall_viewed", { reason: entitlement.blockReason ?? "unknown" });
    return NextResponse.json(
      {
        error:
          entitlement.blockReason === "free_grade_used"
            ? `You've used your ${entitlement.limit} free lifetime grades. Upgrade to keep grading.`
            : entitlement.blockReason === "period_limit_reached"
              ? `You've used all ${entitlement.limit} grades for this billing period.`
              : entitlement.blockReason === "subscription_inactive"
                ? "Your subscription isn't active. Reactivate to keep grading."
                : entitlement.blockReason === "billing_not_configured"
                  ? `You've used your ${entitlement.limit} free grades. Paid plans are coming soon.`
                  : "Grading isn't available right now.",
        code: entitlement.blockReason ?? "not_entitled",
      },
      { status: 402 },
    );
  }

  // ---------- per-network free-grade limit ----------
  // Stops one person farming free grades with throwaway emails. Free tier only;
  // paying users are never IP-limited. Fails open if the count query errors —
  // the per-account free-grade gate above still applies.
  if (entitlement.plan === "free" && !entitlement.devBypass && ipHash) {
    try {
      const usedInWindow = await countRecentFreeGradesByIp(ipHash);
      if (isFreeGradeIpBlocked({ ipHash, usedInWindow })) {
        track("paywall_viewed", { reason: "free_ip_limit" });
        return NextResponse.json(
          {
            error:
              "You've hit the free-grade limit for your current network. This can happen on shared or campus WiFi — it resets in a few days, or you can upgrade for unlimited grading.",
            code: "free_ip_limit",
          },
          { status: 429 },
        );
      }
    } catch {
      // fail open
    }
  }

  // ---------- parse input ----------
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const pastedMaterials = String(form.get("material_text") || "").trim();
  const pastedWork = String(form.get("work_text") || "").trim();
  const title = String(form.get("title") || "").trim() || "Untitled assignment";
  const course = String(form.get("course") || "").trim() || null;
  const workType = String(form.get("work_type") || "unspecified").trim() || "unspecified";
  let citationStyle = String(form.get("citation_style") || "not_specified").trim();
  if (!CITATION_STYLES.has(citationStyle)) citationStyle = "not_specified";
  const existingAssignmentId = String(form.get("assignment_id") || "").trim() || null;

  // FormData preserves append order -> user-defined page order.
  const materialFiles = form.getAll("material_files").filter(isFile);
  const workFiles = form.getAll("work_files").filter(isFile);

  if (materialFiles.length > MAX_FILES_PER_SECTION || workFiles.length > MAX_FILES_PER_SECTION) {
    return NextResponse.json(
      {
        error: `You can attach up to ${MAX_FILES_PER_SECTION} files per section.`,
        code: "too_many_files",
      },
      { status: 400 },
    );
  }

  const hasMaterialSource =
    pastedMaterials.length > 0 || materialFiles.length > 0 || !!existingAssignmentId;
  const hasWorkSource = pastedWork.length > 0 || workFiles.length > 0;

  if (!hasMaterialSource) {
    return NextResponse.json(
      { error: "Add your grading materials (upload or paste).", code: "missing_materials" },
      { status: 400 },
    );
  }
  if (!hasWorkSource) {
    return NextResponse.json(
      { error: "Add your work (upload or paste).", code: "missing_work" },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // ---------- assignment (create or reuse for re-grade) ----------
  let assignmentId = existingAssignmentId;
  let priorMaterialsText = "";
  let priorMaterialImages: ImagePart[] = [];
  if (assignmentId) {
    const { data: existing } = await admin
      .from("assignments")
      .select("id, user_id, grading_materials_text")
      .eq("id", assignmentId)
      .single();
    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
    priorMaterialsText = existing.grading_materials_text ?? "";
    priorMaterialImages = await loadPriorMaterialImages(assignmentId);
  } else {
    const { data: created, error } = await admin
      .from("assignments")
      .insert({
        user_id: user.id,
        title,
        course,
        work_type: workType,
        citation_style: citationStyle,
        grading_materials_text: "",
      })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Could not create the assignment." }, { status: 500 });
    }
    assignmentId = created.id;
  }

  // ---------- draft number ----------
  const { data: prevAttempts } = await admin
    .from("grading_attempts")
    .select("draft_number")
    .eq("assignment_id", assignmentId)
    .order("draft_number", { ascending: false })
    .limit(1);
  const draftNumber = (prevAttempts?.[0]?.draft_number ?? 0) + 1;

  // ---------- process files (preserving order) ----------
  const materialTexts: string[] = [];
  const materialImages: ImagePart[] = [...priorMaterialImages];
  const workTexts: string[] = [];
  const workImages: ImagePart[] = [];
  const fileErrors: string[] = [];

  for (let i = 0; i < materialFiles.length; i++) {
    const p = await processUpload(materialFiles[i], "grading_material", i, user.id, assignmentId!);
    if (p.extractionStatus === "failed") {
      fileErrors.push(p.error || `We couldn't read "${p.originalName}".`);
      continue;
    }
    if (p.image) materialImages.push(p.image);
    if (p.text) materialTexts.push(`--- ${p.originalName} ---\n${p.text}`);
  }

  for (let i = 0; i < workFiles.length; i++) {
    const p = await processUpload(workFiles[i], "work", i, user.id, assignmentId!);
    if (p.extractionStatus === "failed") {
      fileErrors.push(p.error || `We couldn't read "${p.originalName}".`);
      continue;
    }
    if (p.image) workImages.push(p.image);
    if (p.text) workTexts.push(`--- ${p.originalName} (page ${i + 1}) ---\n${p.text}`);
  }

  if (fileErrors.length > 0) {
    return NextResponse.json(
      { error: fileErrors.join(" "), code: "extraction_failed" },
      { status: 422 },
    );
  }

  // ---------- consolidate ----------
  const gradingMaterialsText = [
    existingAssignmentId ? priorMaterialsText : "",
    pastedMaterials,
    ...materialTexts,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const workText = [pastedWork, ...workTexts].filter(Boolean).join("\n\n").trim();

  if (!gradingMaterialsText && materialImages.length === 0) {
    return NextResponse.json(
      { error: "We couldn't read any grading materials from what you provided.", code: "missing_materials" },
      { status: 422 },
    );
  }
  if (!workText && workImages.length === 0) {
    return NextResponse.json(
      { error: "We couldn't read any of your work from what you provided.", code: "missing_work" },
      { status: 422 },
    );
  }

  await admin
    .from("assignments")
    .update({
      grading_materials_text: gradingMaterialsText,
      ...(existingAssignmentId
        ? {}
        : { title, course, work_type: workType, citation_style: citationStyle }),
    })
    .eq("id", assignmentId!);

  // ---------- create attempt (processing) ----------
  const { data: attempt, error: attemptErr } = await admin
    .from("grading_attempts")
    .insert({
      assignment_id: assignmentId,
      user_id: user.id,
      draft_number: draftNumber,
      work_text: workText,
      status: "processing",
    })
    .select("id")
    .single();
  if (attemptErr || !attempt) {
    return NextResponse.json({ error: "Could not start grading." }, { status: 500 });
  }

  // attach files to this attempt
  await admin
    .from("submission_files")
    .update({ grading_attempt_id: attempt.id })
    .eq("assignment_id", assignmentId!)
    .is("grading_attempt_id", null);

  track("grading_started", { draft: draftNumber, plan: entitlement.plan });

  // ---------- grade ----------
  try {
    const { result } = await gradeSubmission({
      gradingMaterialsText,
      workText,
      assignmentTitle: title,
      course,
      citationStyle,
      materialImages,
      workImages,
    });

    await admin
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
      .eq("id", attempt.id);

    // Record usage ONLY after a successful, valid, persisted result.
    await recordUsage(user.id, attempt.id, entitlement, ipHash);

    track("grading_completed", { draft: draftNumber, score: result.score });
    if (entitlement.plan === "free") track("free_grade_used");

    return NextResponse.json({ attemptId: attempt.id, assignmentId });
  } catch (err) {
    // Unreadable photo(s): fail the attempt, name the pages, DO NOT charge.
    if (err instanceof UnreadableImageError) {
      await admin
        .from("grading_attempts")
        .update({
          status: "failed",
          error_message: err.studentMessage.slice(0, 500),
        })
        .eq("id", attempt.id);

      return NextResponse.json(
        {
          error: err.studentMessage,
          code: "unreadable_image",
          images: err.images,
        },
        { status: 422 },
      );
    }

    await admin
      .from("grading_attempts")
      .update({
        status: "failed",
        error_message: (err as Error).message?.slice(0, 500) ?? "Grading failed",
      })
      .eq("id", attempt.id);

    return NextResponse.json(
      {
        error:
          "We couldn't finish grading this submission. Your credit was not used — please try again.",
        code: "grading_failed",
      },
      { status: 502 },
    );
  }
}

function isFile(v: FormDataEntryValue): v is File {
  return typeof v === "object" && v !== null && "arrayBuffer" in v && (v as File).size > 0;
}
