import "server-only";
import mammoth from "mammoth";
import { limits } from "@/lib/env";

export type FileRole = "grading_material" | "work";

export interface ExtractionResult {
  /** Extracted text (may be empty for images). */
  text: string;
  /** For images: a base64 payload to hand to the vision model. */
  image?: { mediaType: string; base64: string };
  status: "extracted" | "failed";
  error?: string;
}

const TEXT_EXT = new Set(["txt", "text", "md"]);
const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/jpeg", // converted
  heif: "image/jpeg",
};

/** Both sections accept the same set: documents + photos/screenshots. */
export const ALLOWED_EXTS = [
  "pdf",
  "docx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "heic",
];

export function extOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAllowed(name: string, role: FileRole): boolean {
  void role; // same allow-list for both roles today
  return ALLOWED_EXTS.includes(extOf(name));
}

const DOC_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];
const IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
];

/** Server-side MIME allow-list check (same list for both roles). */
export function mimeAllowed(mime: string, role: FileRole): boolean {
  void role;
  return (
    DOC_MIMES.includes(mime) ||
    IMAGE_MIMES.includes(mime) ||
    mime === "application/octet-stream" // some browsers send this for HEIC
  );
}

export async function extractFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<ExtractionResult> {
  try {
    if (buffer.byteLength > limits.maxUploadBytes) {
      return {
        text: "",
        status: "failed",
        error: `File is larger than the ${Math.round(
          limits.maxUploadBytes / 1024 / 1024,
        )} MB limit.`,
      };
    }

    const ext = extOf(fileName);

    if (ext === "pdf" || mimeType === "application/pdf") {
      return await extractPdf(buffer);
    }

    if (
      ext === "docx" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      const text = value.trim();
      if (!text) {
        return { text: "", status: "failed", error: "The document appears to be empty." };
      }
      return { text, status: "extracted" };
    }

    if (TEXT_EXT.has(ext) || mimeType.startsWith("text/")) {
      const text = buffer.toString("utf-8").trim();
      if (!text) {
        return { text: "", status: "failed", error: "The file is empty." };
      }
      return { text, status: "extracted" };
    }

    if (ext in IMAGE_MIME || mimeType.startsWith("image/")) {
      return await prepareImage(buffer, ext, mimeType);
    }

    return {
      text: "",
      status: "failed",
      error: "Unsupported file type. Use PDF, DOCX, TXT, JPG, PNG or HEIC.",
    };
  } catch (err) {
    return {
      text: "",
      status: "failed",
      error:
        err instanceof Error
          ? `We couldn't read this file: ${err.message}`
          : "We couldn't read this file.",
    };
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  if (data.numpages > limits.maxPdfPages) {
    return {
      text: "",
      status: "failed",
      error: `This PDF has ${data.numpages} pages; the limit is ${limits.maxPdfPages}.`,
    };
  }
  const text = (data.text || "").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 20) {
    return {
      text: "",
      status: "failed",
      error:
        "We couldn't extract text from this PDF. It may be a scan — try uploading photos/screenshots of the pages instead.",
    };
  }
  return { text, status: "extracted" };
}

async function prepareImage(
  buffer: Buffer,
  ext: string,
  mimeType: string,
): Promise<ExtractionResult> {
  let outBuffer = buffer;
  let mediaType = mimeType.startsWith("image/") ? mimeType : IMAGE_MIME[ext];

  if (
    ext === "heic" ||
    ext === "heif" ||
    mimeType.includes("heic") ||
    mimeType.includes("heif")
  ) {
    try {
      const heicConvert = (await import("heic-convert")).default;
      const converted = await heicConvert({
        // @ts-expect-error heic-convert accepts a Buffer/ArrayBuffer
        buffer,
        format: "JPEG",
        quality: 0.9,
      });
      outBuffer = Buffer.from(converted);
      mediaType = "image/jpeg";
    } catch {
      return {
        text: "",
        status: "failed",
        error: "We couldn't convert this HEIC image. Try exporting it as JPG or PNG.",
      };
    }
  }

  if (
    !mediaType ||
    !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType)
  ) {
    mediaType = "image/jpeg";
  }

  return {
    text: "",
    image: { mediaType, base64: outBuffer.toString("base64") },
    status: "extracted",
  };
}
