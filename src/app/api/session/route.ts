import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight auth probe for the client (no Supabase JS lock contention). */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ authed: !!user });
}
