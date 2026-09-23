/** Browser-side TikTok event helper. Safe to import anywhere; no-ops on the server. */

export type TikTokClientEvent =
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "ViewContent";

export interface TikTokClientProps {
  value?: number;
  currency?: string;
  content_id?: string;
}

interface Ttq {
  track: (event: string, params?: object, options?: { event_id: string }) => void;
  page: () => void;
}

declare global {
  interface Window {
    ttq?: Ttq;
  }
}

/**
 * Fires the browser pixel and mirrors the event to /api/tiktok/event (the
 * Events API) with a shared event_id so TikTok counts it once. `window.ttq`
 * only exists when the pixel was rendered, i.e. configured and allowed for
 * this visitor, so this is a no-op otherwise.
 */
export function trackTikTok(event: TikTokClientEvent, props: TikTokClientProps = {}) {
  try {
    if (typeof window === "undefined" || !window.ttq) return;
    const eventId = crypto.randomUUID();
    window.ttq.track(event, props, { event_id: eventId });
    void fetch("/api/tiktok/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        event_id: eventId,
        url: window.location.href,
        referrer: document.referrer || undefined,
        ...props,
      }),
    }).catch(() => {});
  } catch {
    /* tracking must never break the app */
  }
}
