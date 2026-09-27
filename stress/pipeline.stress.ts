import { describe, it, expect } from "vitest";
import { extractFromBuffer } from "@/lib/extraction";
import { textPhoto, makePdf } from "./gen";

const mb = (n: number) => (n / 1024 / 1024).toFixed(2) + " MB";

describe("upload + extraction at the limits (no AI calls)", () => {
  it("8 full-size phone photos: time, memory, payload sizes", async () => {
    const lines = Array.from({ length: 30 }, (_, i) => `${i + 1}) Solve 3x + ${i + 4} = ${2 * i + 40}, so 3x = ${i + 36}, x = ${(i + 36) / 3}`);
    const originals: Buffer[] = [];
    for (let i = 0; i < 8; i++) originals.push(await textPhoto(lines, { seed: i + 1 }));
    const originalTotal = originals.reduce((a, b) => a + b.byteLength, 0);

    const rssBefore = process.memoryUsage().rss;
    const t0 = Date.now();
    let sentBytes = 0;
    for (const [i, buf] of originals.entries()) {
      const r = await extractFromBuffer(buf, `page${i + 1}.jpg`, "image/jpeg");
      expect(r.status).toBe("extracted");
      sentBytes += Buffer.from(r.image!.base64, "base64").byteLength;
    }
    const ms = Date.now() - t0;
    const rssPeak = process.memoryUsage().rss;
    console.log(
      `PHOTOS x8: originals ${mb(originalTotal)} (avg ${mb(originalTotal / 8)} each, the upload the browser sends)\n` +
        `  after downscale ${mb(sentBytes)} sent to AI; extraction ${(ms / 1000).toFixed(1)}s total (${Math.round(ms / 8)} ms each); RSS +${mb(rssPeak - rssBefore)}`,
    );
    console.log(`  VERCEL REQUEST LIMIT 4.5 MB -> ${originalTotal > 4.5 * 1024 * 1024 ? "OVER: the upload would be rejected in production" : "ok"}`);
  });

  it("40-page PDF extracts; 41+ pages are refused", async () => {
    const t0 = Date.now();
    const ok = await extractFromBuffer(makePdf(40), "big.pdf", "application/pdf");
    console.log(`PDF 40 pages: ${ok.status}, ${ok.text.length.toLocaleString()} chars, ${Date.now() - t0} ms`);
    expect(ok.status).toBe("extracted");
    const over = await extractFromBuffer(makePdf(45), "toobig.pdf", "application/pdf");
    console.log(`PDF 45 pages: ${over.status} ${over.error ?? ""}`);
    expect(over.status).toBe("failed");
  });

  it("a 12 MB photo and a corrupt image do not crash extraction", async () => {
    const big = await textPhoto(["x"], { w: 6000, h: 8000, seed: 9 });
    const r1 = await extractFromBuffer(big, "huge.jpg", "image/jpeg");
    console.log(`Huge photo ${mb(big.byteLength)}: ${r1.status} ${r1.error ?? ""}`);
    const r2 = await extractFromBuffer(Buffer.from("not really a jpeg"), "bad.jpg", "image/jpeg");
    console.log(`Corrupt image: ${r2.status} ${r2.error ?? ""}`);
    expect(["extracted", "failed"]).toContain(r1.status);
    expect(["extracted", "failed"]).toContain(r2.status);
  });
});
