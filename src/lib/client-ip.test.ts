import { describe, it, expect } from "vitest";
import { getClientIp, hashIp, clientIpHash } from "./client-ip";

const h = (obj: Record<string, string>) => new Headers(obj);

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1" }))).toBe(
      "1.2.3.4",
    );
  });

  it("trims surrounding whitespace", () => {
    expect(getClientIp(h({ "x-forwarded-for": "  1.2.3.4  " }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(h({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("returns null when no IP headers are present", () => {
    expect(getClientIp(h({}))).toBeNull();
  });

  it("returns null for an empty x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "" }))).toBeNull();
  });
});

describe("hashIp", () => {
  it("is deterministic for the same input", () => {
    expect(hashIp("1.2.3.4")).toBe(hashIp("1.2.3.4"));
  });

  it("produces different hashes for different IPs", () => {
    expect(hashIp("1.2.3.4")).not.toBe(hashIp("1.2.3.5"));
  });

  it("does not embed the raw IP", () => {
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });

  it("returns a 64-char hex sha-256 digest", () => {
    expect(hashIp("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("clientIpHash", () => {
  it("hashes the resolved client IP", () => {
    expect(clientIpHash(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe(
      hashIp("1.2.3.4"),
    );
  });

  it("returns null when the IP can't be determined", () => {
    expect(clientIpHash(h({}))).toBeNull();
  });
});
