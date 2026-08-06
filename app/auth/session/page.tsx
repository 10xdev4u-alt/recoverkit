"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Session bootstrap for implicit-flow magic links.
 *
 * The normal sign-in flow uses PKCE (tokens exchanged at /auth/callback with
 * ?code=). Admin-minted / legacy magic links deliver tokens in the URL hash
 * (#access_token=...) instead. The browser client's detectSessionInUrl picks
 * those up on construction; this page turns that session into a dashboard
 * redirect.
 */
export default function AuthSessionPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/dashboard");
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        // No session in the hash — the link was stale or already used.
        setFailed(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (failed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md text-center">
          <p className="text-3xl" aria-hidden="true">
            🔗
          </p>
          <h1 className="mt-4 font-display text-2xl font-medium">
            This link is no longer valid
          </h1>
          <p className="mt-3 text-sm text-muted">
            Magic links expire after 24 hours or once they&apos;ve been used.
            Request a fresh one from the sign-in page.
          </p>
          <a
            href="/sign-in"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Go to sign-in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          RecoverKit
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium">
          Signing you in…
        </h1>
      </div>
    </main>
  );
}
