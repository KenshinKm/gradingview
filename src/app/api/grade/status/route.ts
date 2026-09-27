import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { STALE_PROCESSING_MS } from "@/lib/grading/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  status: string;
  error_message: string | null;
  created_at: string;
  result: { blocked?: { code?: string; mismatch?: unknown; images?: unknown }; partial?: unknown } | null;
};

/** Progress of one grading attempt, for the form and the results page to poll. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("attemptId") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Bad attempt id." }, { status: 400 });
  }

  // RLS limits this to the signed-in student's own attempts.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("grading_attempts")
    .select("status, error_message, created_at, result")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const ageMs = Date.now() - new Date(data.created_at).getTime();
  const noStore = { headers: { "Cache-Control": "no-store" } };

  if (data.status === "complete") return NextResponse.json({ status: "complete" }, noStore);

  if (data.status === "failed") {
    const blocked = data.result?.blocked;
    return NextResponse.json(
      {
        status: "failed",
        code: blocked?.code ?? "grading_failed",
        error: data.error_message ?? "Grading didn't finish.",
        mismatch: blocked?.code === "context_mismatch" ? blocked.mismatch : undefined,
        images: blocked?.code === "unreadable_image" ? blocked.images : undefined,
      },
      noStore,
    );
  }

  // Still processing. If it has been far too long the job died: say so, no charge.
  if (ageMs > STALE_PROCESSING_MS) {
    return NextResponse.json(
      {
        status: "failed",
        code: "grading_failed",
        error: "This grade took too long and didn't finish. Your credit was not used. Please try again.",
      },
      noStore,
    );
  }
  return NextResponse.json(
    { status: "processing", elapsedMs: ageMs, partial: data.result?.partial ?? null },
    noStore,
  );
}
