"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "done" | "error" | "server-error";

export function WaitlistForm({ id = "landing" }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!valid) {
      setState("error");
      return;
    }

    setState("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: id }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error === "Waitlist is not configured yet") {
          setState("server-error");
        } else {
          setState("error");
        }
        return;
      }
      setState("done");
    } catch {
      setState("server-error");
    }
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
          disabled={state === "submitting"}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error" || state === "server-error") setState("idle");
          }}
          placeholder="you@yourstartup.com"
          className="h-12 flex-1 rounded-full border border-border-subtle bg-surface px-5 text-sm text-foreground outline-none transition-all placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          className="h-12 rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "submitting" ? "Joining…" : "Get early access"}
        </button>
      </div>
      {state === "error" && (
        <p className="mt-2 pl-4 text-xs text-bad">
          That email doesn&apos;t look right — mind checking it?
        </p>
      )}
      {state === "server-error" && (
        <p className="mt-2 pl-4 text-xs text-bad">
          Couldn&apos;t reach the signup service — try again in a moment.
        </p>
      )}
    </form>
  );
}
