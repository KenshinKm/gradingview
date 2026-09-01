import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeForm } from "@/components/grade-form";
import { Disclaimer } from "@/components/disclaimer";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import type { Assignment, GradingAttempt } from "@/lib/types";

export const metadata = { title: "Grade My Work" };
export const dynamic = "force-dynamic";

export default async function GradePage({
  searchParams,
}: {
  searchParams: Promise<{ assignment?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/grade");

  const entitlement = await getEntitlement(user.id);
  if (!entitlement.canGrade) {
    redirect(`/pricing?reason=${entitlement.blockReason ?? "not_entitled"}`);
  }

  const { assignment: assignmentId } = await searchParams;
  let regrade:
    | { assignment: Assignment; nextDraft: number; lastScore: number | null }
    | undefined;

  if (assignmentId) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("assignments")
      .select("*, grading_attempts(draft_number, score, status)")
      .eq("id", assignmentId)
      .single<Assignment & { grading_attempts: GradingAttempt[] }>();

    if (data) {
      const complete = data.grading_attempts.filter((a) => a.status === "complete");
      const maxDraft = Math.max(0, ...data.grading_attempts.map((a) => a.draft_number));
      const last = complete.sort((a, b) => b.draft_number - a.draft_number)[0];
      regrade = {
        assignment: data,
        nextDraft: maxDraft + 1,
        lastScore: last?.score ?? null,
      };
    }
  }

  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {regrade ? `Re-grade: ${regrade.assignment.title}` : "Grade my work"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {regrade
              ? `This will be Draft ${regrade.nextDraft}. Your original grading materials are kept — update your work below.`
              : "Upload how your work will be graded, plus your completed work. Your first grade is free."}
          </p>

          <div className="mt-6">
            <GradeForm regrade={regrade} />
          </div>

          <div className="mt-6">
            <Disclaimer />
          </div>
        </div>
      </main>
    </div>
  );
}
