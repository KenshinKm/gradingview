/**
 * Lightweight analytics abstraction. Safe to call from client or server.
 *
 * Client-side events are forwarded to Vercel Web Analytics as custom events.
 * Server-side events (Stripe webhook, grade route) only log in dev — the
 * authoritative source for those is Stripe's dashboard and the database.
 */
export type AnalyticsEvent =
  | "landing_cta_clicked"
  | "account_created"
  | "grading_started"
  | "grading_completed"
  | "free_grade_used"
  | "regrade_clicked"
  | "paywall_viewed"
  | "checkout_started"
  | "subscription_started"
  | "assignment_deleted";

type Props = Record<string, string | number | boolean | null | undefined>;

/** Vercel custom-event props can't be undefined — drop those keys. */
function clean(props?: Props): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function sink(event: AnalyticsEvent, props?: Props) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${event}`, props ?? {});
  }

  if (typeof window !== "undefined") {
    import("@vercel/analytics")
      .then(({ track }) => track(event, clean(props)))
      .catch(() => {});
  }
}

export function track(event: AnalyticsEvent, props?: Props) {
  try {
    sink(event, props);
  } catch {
    /* analytics must never break the app */
  }
}
