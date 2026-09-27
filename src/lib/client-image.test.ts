import { describe, it, expect } from "vitest";
import { fitWithin, formatMb, requestBytes, MAX_EDGE, MAX_REQUEST_BYTES } from "./client-image";

describe("client image helpers", () => {
  it("fits large photos inside the max edge and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: MAX_EDGE, height: 1200 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: MAX_EDGE });
  });
  it("never enlarges", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("adds up file and text bytes", () => {
    const f = new File([new Uint8Array(1000)], "a.jpg");
    expect(requestBytes([f, f], ["héllo"])).toBe(2000 + 6);
  });
  it("formats megabytes and stays under Vercel's 4.5 MB", () => {
    expect(formatMb(1.5 * 1024 * 1024)).toBe("1.5 MB");
    expect(MAX_REQUEST_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});
