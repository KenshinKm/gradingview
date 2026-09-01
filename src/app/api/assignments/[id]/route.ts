import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: assignment } = await admin
    .from("assignments")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!assignment || assignment.user_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Remove stored files first.
  const { data: files } = await admin
    .from("submission_files")
    .select("storage_path")
    .eq("assignment_id", id);

  if (files && files.length > 0) {
    await admin.storage
      .from(supabaseEnv.bucket)
      .remove(files.map((f) => f.storage_path));
  }

  // Cascade deletes grading_attempts + submission_files rows.
  const { error } = await admin.from("assignments").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
