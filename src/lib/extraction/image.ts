import sharp from "sharp";

/** Longest side sent to the model. The API shrinks anything larger anyway. */
export const MAX_IMAGE_EDGE = 1600;
const JPEG_QUALITY = 85;

export interface PreparedImage {
  mediaType: string;
  buffer: Buffer;
}

/**
 * Shrinks a photo before it goes to the model: fixes phone rotation (EXIF),
 * caps the longest side, and re-encodes as JPEG. This keeps requests small and
 * fast and avoids the API's per-image size limit. If anything goes wrong, the
 * original bytes are returned unchanged so a grade never fails because of this.
 */
export async function downscaleImage(
  buffer: Buffer,
  mediaType: string,
): Promise<PreparedImage> {
  try {
    const out = await sharp(buffer, { failOn: "none" })
      .rotate() // apply EXIF orientation, then drop it
      .resize({
        width: MAX_IMAGE_EDGE,
        height: MAX_IMAGE_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" }) // transparent PNGs become white, not black
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    // Never make a small, already-tight file bigger.
    if (out.byteLength >= buffer.byteLength && buffer.byteLength < 400_000) {
      return { mediaType, buffer };
    }
    return { mediaType: "image/jpeg", buffer: out };
  } catch {
    return { mediaType, buffer };
  }
}
