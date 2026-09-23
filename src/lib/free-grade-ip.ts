import { PLANS } from "@/lib/plans";

/**
 * Per-network limit on free grades.
 *
 * The free tier gives a few lifetime grades per account. Without email
 * verification, one person can farm that by signing up with throwaway
 * addresses. Capping successful free grades per client IP over a rolling
 * window blunts that without adding a verification step for real users.
 *
 * Defaults to 3x one account's full free allotment, so a single real user
 * spending all of their own free grades can't lock out others on the same
 * network (e.g. roommates, a family) — and stays proportional automatically
 * if PLANS.free.gradeLimit ever changes.
 *
 * Only the free tier is limited — paying users are never IP-limited, so a
 * shared campus/office network can still have many subscribers.
 */

export const FREE_GRADE_IP_WINDOW_DAYS = 7;

/** Successful free grades allowed per network per window. Env-tunable. */
export const FREE_GRADE_IP_LIMIT = Math.max(
  1,
  Number(process.env.FREE_GRADE_IP_LIMIT) || PLANS.free.gradeLimit * 3,
);

export interface FreeGradeIpState {
  /** null when the client IP couldn't be determined — treated as allowed. */
  ipHash: string | null;
  /** Successful free grades already recorded for this ipHash in the window. */
  usedInWindow: number;
}

export function isFreeGradeIpBlocked({
  ipHash,
  usedInWindow,
}: FreeGradeIpState): boolean {
  if (!ipHash) return false;
  return usedInWindow >= FREE_GRADE_IP_LIMIT;
}
