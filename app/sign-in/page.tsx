"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Surfaced from /auth/callback on a failed/expired magic link exchange.
  // Read in an effect so the page stays prerender-safe (no useSearchParams).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "callback") {
      setError("This magic link has expired. Request a new one below.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabase();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-8 text-center">
          <p className="text-3xl" aria-hidden="true">
            ✉️
          </p>
          <h1 className="mt-4 font-display text-2xl font-medium">Check your inbox</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
            Click it to open your dashboard.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          RecoverKit
        </p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          Sign in to your dashboard
        </h1>
        <p className="mt-3 text-sm text-muted">
          Magic link, no password. We&apos;ll email you a link that signs you in.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border-subtle bg-surface p-6"
        >
          <label htmlFor="email" className="block text-sm font-medium">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourstore.com"
            className="mt-3 h-12 w-full rounded-xl border border-border-subtle bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />

          {error && (
            <p className="mt-3 text-sm text-bad" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Sending link…" : "Email me a magic link"}
          </button>
        </form>
      </div>
    </main>
  );
}
