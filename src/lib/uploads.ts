import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv, limits } from "@/lib/env";
import {
  extractFromBuffer,
  mimeAllowed,
  isAllowed,
  type FileRole,
} from "@/lib/extraction";
import type { ImagePart } from "@/lib/grading/llm";

/**
 * Re-grade materials only carry forward as `grading_materials_text` on the
 * assignment row, which is empty when the original materials were photos
 * (extraction never turns an image into text). Re-fetch and re-extract those
 * images from storage so "your original materials are kept automatically"
 * actually holds for photographed rubrics, not just typed/PDF ones.
 */
export async function loadPriorMaterialImages(
  assignmentId: string,
): Promise<ImagePart[]> {
  const admin = createSupabaseAdminClient();
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path, original_name, mime_type")
    .eq("assignment_id", assignmentId)
    .eq("role", "grading_material")
    .order("sort_order", { ascending: true });

  if (!files || files.length === 0) return [];

  const images: ImagePart[] = [];
  for (const f of files) {
    const { data: blob } = await admin.storage
      .from(supabaseEnv.bucket)
      .download(f.storage_path);
    if (!blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const extracted = await extractFromBuffer(buffer, f.original_name, f.mime_type);
    if (extracted.image) images.push(extracted.image);
  }
  return images;
}

export interface ProcessedUpload {
  fileId: string;
  role: FileRole;
  sortOrder: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  extractionStatus: "extracted" | "failed";
  text: string;
  image?: ImagePart;
  error?: string;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Validate -> extract -> store one uploaded file.
 * Storage path is always `${userId}/${assignmentId}/...` so RLS keeps it private.
 * `sortOrder` preserves the user-defined page order for multi-photo uploads.
 */
export async function processUpload(
  file: File,
  role: FileRole,
  sortOrder: number,
  userId: string,
  assignmentId: string,
): Promise<ProcessedUpload> {
  const admin = createSupabaseAdminClient();
  const fileId = crypto.randomUUID();
  const originalName = file.name || "upload";
  const mimeType = file.type || "application/octet-stream";
  const buffer = Buffer.from(await file.arrayBuffer());

  const base: Omit<ProcessedUpload, "extractionStatus" | "text"> = {
    fileId,
    role,
    sortOrder,
    originalName,
    mimeType,
    sizeBytes: buffer.byteLength,
    storagePath: `${userId}/${assignmentId}/${role}/${sortOrder}-${fileId}-${safeName(originalName)}`,
  };

  if (buffer.byteLength > limits.maxUploadBytes) {
    return {
      ...base,
      extractionStatus: "failed",
      text: "",
      error: `"${originalName}" is larger than the ${Math.round(limits.maxUploadBytes / 1024 / 1024)} MB limit.`,
    };
  }

  if (!isAllowed(originalName, role) || !mimeAllowed(mimeType, role)) {
    return {
      ...base,
      extractionStatus: "failed",
      text: "",
      error: `"${originalName}" isn't a supported file type. Use PDF, DOCX, TXT, JPG, PNG or HEIC.`,
    };
  }

  await admin.storage
    .from(supabaseEnv.bucket)
    .upload(base.storagePath, buffer, { contentType: mimeType, upsert: true });

  const extracted = await extractFromBuffer(buffer, originalName, mimeType);

  await admin.from("submission_files").insert({
    id: fileId,
    user_id: userId,
    assignment_id: assignmentId,
    role,
    sort_order: sortOrder,
    storage_path: base.storagePath,
    original_name: originalName,
    mime_type: mimeType,
    size_bytes: buffer.byteLength,
    extraction_status: extracted.status,
    extracted_text: extracted.text || null,
  });

  return {
    ...base,
    extractionStatus: extracted.status,
    text: extracted.text,
    image: extracted.image,
    error: extracted.error,
  };
}
