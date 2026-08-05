import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client (service-role, bypasses RLS).
 * Returns null when env vars aren't configured yet — callers should
 * degrade gracefully (e.g. a 503 from the waitlist route).
 */
export function createServerClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached =
    url && key
      ? createClient(url, key, { auth: { persistSession: false } })
      : null;

  return cached;
}
