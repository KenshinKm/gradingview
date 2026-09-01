import Link from "next/link";
import type { Entitlement } from "@/lib/entitlements";
import { usageFillClass, usagePercent } from "@/lib/usage-meter";

/**
 * Visual-only usage meter. The server (`getEntitlement`) is authoritative for
 * every number shown here — the frontend never enforces limits.
 */
function formatResetDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
}

export function UsageMeter({ entitlement }: { entitlement: Entitlement }) {
  const { limit, used, remaining, plan, limitScope, periodEnd, devBypass } =
    entitlement;

  // In dev the bypass allows exceeding the limit — never render "3 of 1".
  const shownUsed = Math.min(used, limit);
  const pctUsed = usagePercent(shownUsed, limit);
  const atLimit = remaining <= 0;
  const resetDate = formatResetDate(periodEnd);
  const isLifetime = limitScope === "lifetime";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Grading usage
        </p>
        <p className="text-sm font-semibold text-ink">
          {shownUsed} of {limit} used
        </p>
      </div>

      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-raised"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={shownUsed}
        aria-label={`${shownUsed} of ${limit} grading attempts used`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${usageFillClass(
            pctUsed,
          )}`}
          style={{
            width: `${atLimit ? 100 : Math.max(pctUsed, shownUsed > 0 ? 4 : 0)}%`,
          }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-ink-soft">
          {atLimit
            ? isLifetime
              ? "You've used your free lifetime grade."
              : `You've used all ${limit} grades for this billing period.`
            : `${remaining} grade${remaining === 1 ? "" : "s"} remaining`}
        </p>

        <p className="text-xs text-ink-muted">
          {isLifetime
            ? "1 lifetime grade — does not reset"
            : resetDate
              ? `Resets ${resetDate}`
              : "Resets each billing period"}
        </p>
      </div>

      {devBypass && (
        <p className="mt-3 text-xs text-ink-muted">
          Development mode — usage is shown but not enforced.
        </p>
      )}

      {atLimit && !devBypass && (
        <div className="mt-4">
          <Link href="/pricing" className="btn-primary w-full sm:w-auto">
            {plan === "free" ? "See plans" : "Upgrade plan"}
          </Link>
        </div>
      )}
    </div>
  );
}
