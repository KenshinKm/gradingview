/**
 * Browser-side photo shrinking. Vercel rejects request bodies over 4.5 MB, and
 * one phone photo is often 4 to 6 MB, so photos are resized before upload. This
 * also makes uploads much faster on cellular. The server still downscales again
 * and keeps working if anything here fails.
 */

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;
/** Vercel's function request limit is 4.5 MB; stay under it with room for the form fields. */
export const MAX_REQUEST_BYTES = 4.2 * 1024 * 1024;
/** Photos smaller than this are already fine, so skip re-encoding them. */
const SKIP_UNDER_BYTES = 350 * 1024;

const IMAGE_TYPE = /^image\/(jpeg|png|webp)$/i;

/** Size that fits inside MAX_EDGE on the longest side, never enlarging. */
export function fitWithin(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Total bytes a set of files (plus pasted text) adds to the upload. */
export function requestBytes(files: File[], texts: string[] = []): number {
  return files.reduce((n, f) => n + f.size, 0) + texts.reduce((n, t) => n + new TextEncoder().encode(t).length, 0);
}

/**
 * Returns a smaller JPEG copy of a photo (rotated upright), or the original
 * file if it isn't a photo, is already small, can't be decoded (for example
 * HEIC in Chrome), or the result would not be smaller.
 */
export async function shrinkPhoto(
  file: File,
  opts: { edge?: number; quality?: number; force?: boolean } = {},
): Promise<File> {
  const edge = opts.edge ?? MAX_EDGE;
  const quality = opts.quality ?? JPEG_QUALITY;
  try {
    if (!IMAGE_TYPE.test(file.type) || (!opts.force && file.size < SKIP_UNDER_BYTES)) return file;
    if (typeof createImageBitmap !== "function") return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = fitWithin(bitmap.width, bitmap.height, edge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
