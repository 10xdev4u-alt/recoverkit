"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — used in client components (sign-in form). */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
