import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { downscaleImage, MAX_IMAGE_EDGE } from "./image";

async function photo(w: number, h: number, orientation?: number) {
  let img = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 30, b: 30 } } }).jpeg();
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}

describe("downscaleImage", () => {
  it("shrinks large photos to the max edge and re-encodes as JPEG", async () => {
    const big = await photo(4000, 3000);
    const out = await downscaleImage(big, "image/jpeg");
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(MAX_IMAGE_EDGE);
    expect(meta.height).toBe(1200);
    expect(out.mediaType).toBe("image/jpeg");
    expect(out.buffer.byteLength).toBeLessThan(big.byteLength);
  });

  it("does not enlarge small images", async () => {
    const small = await photo(600, 400);
    const out = await downscaleImage(small, "image/jpeg");
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(600);
  });

  it("applies EXIF rotation so sideways phone photos come out upright", async () => {
    const sideways = await photo(1000, 500, 6); // stored landscape, meant to be portrait
    const out = await downscaleImage(sideways, "image/jpeg");
    const meta = await sharp(out.buffer).metadata();
    expect(meta.width).toBe(500);
    expect(meta.height).toBe(1000);
  });

  it("flattens transparent PNGs onto white", async () => {
    const png = await sharp({ create: { width: 2400, height: 2400, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const out = await downscaleImage(png, "image/png");
    const { data } = await sharp(out.buffer).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(240);
  });

  it("returns the original bytes when the input isn't an image", async () => {
    const junk = Buffer.from("not an image");
    const out = await downscaleImage(junk, "image/png");
    expect(out.buffer).toBe(junk);
    expect(out.mediaType).toBe("image/png");
  });
});
