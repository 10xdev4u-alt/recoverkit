"use client";

import { useEffect } from "react";

/**
 * Phase 19: route-level error boundary for the dashboard group. A crash in a
 * server component surfaces here with a calm retry instead of the raw error.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-20 text-center">
      <p className="text-4xl" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
        Something went wrong
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        This screen hit an unexpected snag. Your data is safe — try loading it
        again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98]"
      >
        Try again
      </button>
    </main>
  );
}
