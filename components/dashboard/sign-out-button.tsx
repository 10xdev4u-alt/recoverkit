"use client";

import { createBrowserSupabase } from "@/lib/supabase/browser";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      Sign out
    </button>
  );
}
