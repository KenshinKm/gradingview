import { describe, it, expect } from "vitest";
import { trackingAllowed, isValidPixelId, sanitizeClickId } from "./tiktok-consent";

const h = (o: Record<string, string>) => new Headers(o);

describe("trackingAllowed", () => {
  it("allows a normal US visitor", () => {
    expect(trackingAllowed(h({ "x-vercel-ip-country": "US" }))).toBe(true);
  });
  it("allows when country is unknown (local dev)", () => {
    expect(trackingAllowed(h({}))).toBe(true);
  });
  it("blocks when Global Privacy Control is set", () => {
    expect(trackingAllowed(h({ "x-vercel-ip-country": "US", "sec-gpc": "1" }))).toBe(false);
  });
  it("blocks EU, UK, and Swiss visitors", () => {
    for (const c of ["DE", "FR", "IE", "GB", "CH", "NO"]) {
      expect(trackingAllowed(h({ "x-vercel-ip-country": c }))).toBe(false);
    }
  });
  it("is case-insensitive on the country header", () => {
    expect(trackingAllowed(h({ "x-vercel-ip-country": "de" }))).toBe(false);
  });
});

describe("isValidPixelId", () => {
  it("accepts a real-looking pixel id", () => {
    expect(isValidPixelId("DAQ332JC77U17TEHS1CG")).toBe(true);
  });
  it("rejects empty, lowercase, and script-injection attempts", () => {
    expect(isValidPixelId(undefined)).toBe(false);
    expect(isValidPixelId("")).toBe(false);
    expect(isValidPixelId("daq332jc77u17tehs1cg")).toBe(false);
    expect(isValidPixelId("ABC');alert(1);//")).toBe(false);
  });
});

describe("sanitizeClickId", () => {
  it("passes a normal click id and rejects junk", () => {
    expect(sanitizeClickId("E.C.P.abcDEF123_-")).toBe("E.C.P.abcDEF123_-");
    expect(sanitizeClickId("short")).toBeNull();
    expect(sanitizeClickId("has spaces and <script>")).toBeNull();
    expect(sanitizeClickId(null)).toBeNull();
  });
});
