import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeForm } from "@/components/grade-form";
import { Disclaimer } from "@/components/disclaimer";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import type { Assignment } from "@/lib/types";
import { parseLevel, parseSubject } from "@/lib/grading/subjects";
import { SUBJECT_CONFIG, enabledSubjects, isSubjectEnabled } from "@/lib/subject-config";
import Link from "next/link";

export const metadata = { title: "Grade My Work" };
export const dynamic = "force-dynamic";

export default async function GradePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string; subject?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/grade");

  const entitlement = await getEntitlement(user.id);
  if (!entitlement.canGrade) {
    redirect(`/pricing?reason=${entitlement.blockReason ?? "not_entitled"}`);
  }

  const { assignment: assignmentId, subject: subjectParam } = await searchParams;
  let regrade: { assignment: Assignment } | undefined;
  let subject = parseSubject(subjectParam);
  if (!isSubjectEnabled(subject)) subject = "english";
  let level = parseLevel(undefined);

  if (assignmentId) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single<Assignment>();
    if (data) {
      regrade = { assignment: data };
      // A regrade keeps the subject and level of the last completed attempt.
      const { data: last } = await supabase
        .from("grading_attempts")
        .select("result")
        .eq("assignment_id", data.id)
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ result: { understood?: { subject_code?: string; level_code?: string } } | null }>();
      subject = parseSubject(last?.result?.understood?.subject_code);
      level = parseLevel(last?.result?.understood?.level_code);
    }
  }
  const cfg = SUBJECT_CONFIG[subject];

  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-9">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {regrade ? `Check my revision: ${regrade.assignment.title}` : "Grade my work"}
            {cfg.beta && (
              <span
                className="ml-2 align-middle rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: cfg.color, backgroundColor: `${cfg.color}1f` }}
              >
                {cfg.name} beta
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {regrade
              ? "Your grading materials are kept. Just add your revised work below. This counts as one grading attempt."
              : "Upload how your work will be graded, plus your completed work. Your first 3 grades are free."}
          </p>

          {!regrade && enabledSubjects().length > 1 && (
            <div className="mt-5 flex flex-wrap items-center gap-1.5" aria-label="Subject">
              {enabledSubjects().map((s) => {
                const c = SUBJECT_CONFIG[s];
                const active = s === subject;
                return (
                  <Link
                    key={s}
                    href={`/grade?subject=${s}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-surface-raised"
                    style={{
                      color: c.color,
                      backgroundColor: active ? `${c.color}1f` : undefined,
                      boxShadow: active ? `inset 0 0 0 1px ${c.color}66` : undefined,
                    }}
                  >
                    {c.name}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-6">
            <GradeForm key={subject} regrade={regrade} subject={subject} level={level} />
          </div>

          <div className="mt-6">
            <Disclaimer />
          </div>
        </div>
      </main>
    </div>
  );
}
