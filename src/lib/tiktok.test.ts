import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildTikTokPayload,
  hashEmail,
  sendTikTokEvent,
  tiktokCheckoutMetadata,
} from "./tiktok";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("hashEmail", () => {
  it("hashes the trimmed, lowercased address", () => {
    expect(hashEmail("  Student@Example.COM ")).toBe(hashEmail("student@example.com"));
    expect(hashEmail("a@b.co")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildTikTokPayload", () => {
  const opts = { pixelId: "DAQ332JC77U17TEHS1CG", now: 1_700_000_000_000 };

  it("builds the Events API shape with hashed identifiers", () => {
    const p = buildTikTokPayload(
      {
        event: "CompletePayment",
        eventId: "cs_test_123",
        email: "Student@Example.com",
        externalId: "user-1",
        ip: "1.2.3.4",
        userAgent: "UA",
        ttclid: "clid12345",
        value: 9.99,
        currency: "USD",
        contentId: "student",
        url: "https://grading-view.com/pricing",
      },
      opts,
    );
    expect(p.event_source).toBe("web");
    expect(p.event_source_id).toBe("DAQ332JC77U17TEHS1CG");
    const d = p.data[0];
    expect(d.event).toBe("CompletePayment");
    expect(d.event_id).toBe("cs_test_123");
    expect(d.event_time).toBe(1_700_000_000);
    expect(d.user.email).toBe(hashEmail("student@example.com"));
    expect(d.user.ip).toBe("1.2.3.4");
    expect(d.properties).toMatchObject({ value: 9.99, currency: "USD", content_type: "product" });
    expect(d.page.url).toBe("https://grading-view.com/pricing");
  });

  it("never includes the raw email or raw user id", () => {
    const json = JSON.stringify(
      buildTikTokPayload(
        { event: "CompleteRegistration", eventId: "e1", email: "me@school.edu", externalId: "user-abc" },
        opts,
      ),
    );
    expect(json).not.toContain("me@school.edu");
    expect(json).not.toContain("user-abc");
  });

  it("only sets test_event_code when provided", () => {
    const without = buildTikTokPayload({ event: "ViewContent", eventId: "e2" }, opts);
    const withCode = buildTikTokPayload({ event: "ViewContent", eventId: "e2" }, { ...opts, testEventCode: "TEST1" });
    expect("test_event_code" in without).toBe(false);
    expect(withCode.test_event_code).toBe("TEST1");
  });
});

describe("tiktokCheckoutMetadata", () => {
  const cookies = (m: Record<string, string>) => ({
    get: (n: string) => (m[n] ? { value: m[n] } : undefined),
  });

  it("returns nothing when tracking isn't allowed", () => {
    const req = { headers: new Headers({ "sec-gpc": "1" }), cookies: cookies({ ttclid: "abc12345" }) };
    expect(tiktokCheckoutMetadata(req)).toEqual({});
  });

  it("collects attribution and marks tt_ok for trackable visitors", () => {
    const req = {
      headers: new Headers({ "x-forwarded-for": "9.9.9.9", "user-agent": "UA/1", "x-vercel-ip-country": "US" }),
      cookies: cookies({ ttclid: "clid12345", _ttp: "ttp-value" }),
    };
    expect(tiktokCheckoutMetadata(req)).toEqual({
      tt_ok: "1",
      tt_clid: "clid12345",
      tt_ttp: "ttp-value",
      tt_ip: "9.9.9.9",
      tt_ua: "UA/1",
    });
  });
});

describe("sendTikTokEvent", () => {
  const evt = { event: "CompleteRegistration" as const, eventId: "evt12345" };

  it("does nothing when not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "");
    vi.stubEnv("TIKTOK_EVENTS_API_TOKEN", "");
    await sendTikTokEvent(evt);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the Events API with the access token when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ code: 0 }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "DAQ332JC77U17TEHS1CG");
    vi.stubEnv("TIKTOK_EVENTS_API_TOKEN", "secret-token");
    await sendTikTokEvent(evt);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://business-api.tiktok.com/open_api/v1.3/event/track/");
    expect(init.headers["Access-Token"]).toBe("secret-token");
  });

  it("never throws when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.stubEnv("NEXT_PUBLIC_TIKTOK_PIXEL_ID", "DAQ332JC77U17TEHS1CG");
    vi.stubEnv("TIKTOK_EVENTS_API_TOKEN", "secret-token");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendTikTokEvent(evt)).resolves.toBeUndefined();
  });
});
