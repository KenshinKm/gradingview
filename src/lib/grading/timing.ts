/** Hard stop for one grade. Leaves headroom under the route's maxDuration (300s). */
export const GRADE_TIMEOUT_MS = 270_000;

/** An attempt still "processing" after this long is treated as dead and never charged. */
export const STALE_PROCESSING_MS = 6 * 60_000;
