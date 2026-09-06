import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEV_BILLING_BYPASS, billingReady } from "@/lib/env";
import {
  computeEntitlement,
  isActiveStatus,
  type EntitlementDecision,
} from "@/lib/entitlements-core";
import { FREE_GRADE_IP_WINDOW_DAYS } from "@/lib/free-grade-ip";
import type { PlanId } from "@/lib/plans";

export type Entitlement = EntitlementDecision;
export type { BlockReason } from "@/lib/entitlements-core";

/**
 * Server-side entitlement check. NEVER trust usage numbers from the client.
 * Fails closed in production when Stripe billing config is missing.
 */
export async function getEntitlement(userId: string): Promise<Entitlement> {
  const admin = createSupabaseAdminClient();

  const [{ data: profile }, { data: sub }] = await Promise.all([
    admin.from("profiles").select("free_grade_used").eq("id", userId).single(),
    admin
      .from("subscriptions")
      .select("plan, subscription_status, current_period_start, current_period_end")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const subPlan = (sub?.plan ?? "free") as PlanId;
  const subActive = isActiveStatus(sub?.subscription_status);

  let freeUsed = profile?.free_grade_used ? 1 : 0;
  let paidUsedThisPeriod = 0;

  if (subActive && subPlan !== "free" && sub?.current_period_start && sub?.current_period_end) {
    const { count } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "paid_grade")
      .gte("created_at", sub.current_period_start)
      .lt("created_at", sub.current_period_end);
    paidUsedThisPeriod = count ?? 0;
  } else {
    const { count } = await admin
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "free_grade");
    freeUsed = Math.max(freeUsed, count ?? 0);
  }

  return computeEntitlement({
    devBypass: DEV_BILLING_BYPASS,
    billingReady: billingReady(),
    subPlan,
    subActive,
    periodStart: sub?.current_period_start ?? null,
    periodEnd: sub?.current_period_end ?? null,
    freeUsed,
    paidUsedThisPeriod,
  });
}

/**
 * Successful free grades recorded for a hashed client IP within the rolling
 * per-network window. Used to rate-limit free-tier abuse from throwaway
 * accounts. Throws on query failure so the caller can decide to fail open.
 */
export async function countRecentFreeGradesByIp(ipHash: string): Promise<number> {
  const admin = createSupabaseAdminClient();
  const since = new Date(
    Date.now() - FREE_GRADE_IP_WINDOW_DAYS * 86_400_000,
  ).toISOString();

  const { count, error } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "free_grade")
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Record a consumed grading credit. Call ONLY after a successful, valid
 * grading result has been persisted.
 */
export async function recordUsage(
  userId: string,
  gradingAttemptId: string,
  entitlement: Entitlement,
  ipHash?: string | null,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const isFree = entitlement.plan === "free";

  await admin.from("usage_events").insert({
    user_id: userId,
    grading_attempt_id: gradingAttemptId,
    event_type: isFree ? "free_grade" : "paid_grade",
    plan: entitlement.plan,
    period_start: entitlement.periodStart,
    period_end: entitlement.periodEnd,
    ip_hash: ipHash ?? null,
  });

  if (isFree) {
    await admin.from("profiles").update({ free_grade_used: true }).eq("id", userId);
  }
}
