import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS. NEVER import into client code.
 * Use only in trusted server routes after verifying the caller.
 */
export function createSupabaseAdminClient() {
  if (!supabaseEnv.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
