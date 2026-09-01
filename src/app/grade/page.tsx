import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { GradeForm } from "@/components/grade-form";
import { Disclaimer } from "@/components/disclaimer";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements";
import type { Assignment } from "@/lib/types";

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
  let regrade: { assignment: Assignment } | undefined;

  if (assignmentId) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single<Assignment>();
    if (data) regrade = { assignment: data };
  }

  const remaining = entitlement.devBypass ? "unlimited" : entitlement.remaining;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader plan={entitlement.plan} remaining={remaining} />
      <main className="container-page flex-1 py-9">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            {regrade ? `Check my revision: ${regrade.assignment.title}` : "Grade my work"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {regrade
              ? "Your grading materials are kept — just add your revised work below. This counts as one grading attempt."
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
