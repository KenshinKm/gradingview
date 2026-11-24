import { FREE_GRADES_TEMPORARY } from "@/lib/plans";

/**
 * Small pill shown next to the free-grade count while the temporary testing
 * allowance is on (see FREE_GRADES_TEMPORARY in plans.ts). Renders nothing
 * once the promo is off, so it never needs to be removed from the pages.
 */
export function TemporaryBadge({ className = "" }: { className?: string }) {
  if (!FREE_GRADES_TEMPORARY) return null;
  return (
    <span
      title="Free grades are temporarily raised while we test"
      className={`inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-px align-middle text-[9px] font-semibold uppercase tracking-wide text-amber-300 ${className}`}
    >
      Temporary
    </span>
  );
}
