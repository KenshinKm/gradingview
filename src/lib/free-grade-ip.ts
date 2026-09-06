/**
 * Per-network limit on free grades.
 *
 * The free tier gives one lifetime grade per account. Without email
 * verification, one person can farm that by signing up with throwaway
 * addresses. Capping successful free grades per client IP over a rolling
 * window blunts that without adding a verification step for real users.
 *
 * Only the free tier is limited — paying users are never IP-limited, so a
 * shared campus/office network can still have many subscribers.
 */

export const FREE_GRADE_IP_WINDOW_DAYS = 7;

/** Successful free grades allowed per network per window. Env-tunable. */
export const FREE_GRADE_IP_LIMIT = Math.max(
  1,
  Number(process.env.FREE_GRADE_IP_LIMIT) || 3,
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
