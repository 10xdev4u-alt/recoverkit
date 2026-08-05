"use client";

import { useState } from "react";

export function WaitlistForm({ id = "waitlist" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) {
      setState("error");
      return;
    }
    // Phase 3 wires this to POST /api/waitlist (Supabase).
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        <p className="text-sm text-accent-strong">
          You&apos;re on the list. We&apos;ll email you the moment the door opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={`email-${id}`}>
          Email address
        </label>
        <input
          id={`email-${id}`}
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="you@yourstartup.com"
          className="h-12 flex-1 rounded-full border border-border-subtle bg-surface px-5 text-sm text-foreground outline-none transition-all placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          className="h-12 rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98]"
        >
          Get early access
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 pl-4 text-xs text-bad">
          That email doesn&apos;t look right — mind checking it?
        </p>
      )}
    </form>
  );
}
