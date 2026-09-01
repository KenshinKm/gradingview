"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}
