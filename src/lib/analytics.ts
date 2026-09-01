/**
 * Lightweight analytics abstraction. Swap `sink` for PostHog/Segment/etc later.
 * Safe to call from both client and server.
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

function sink(event: AnalyticsEvent, props?: Props) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(`[analytics] ${event}`, props ?? {});
  }
  // TODO: forward to a real provider here.
}

export function track(event: AnalyticsEvent, props?: Props) {
  try {
    sink(event, props);
  } catch {
    /* analytics must never break the app */
  }
}
