import Link from "next/link";

/**
 * Shared terminal state for the recovery page: invalid/expired link, or
 * "not available yet". Calm, non-alarmist — the merchant's plan is never
 * threatened (EMAIL_TEMPLATES §3: no urgency theater).
 */
export function ExpiredLink({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-8 text-center">
        <p className="text-3xl" aria-hidden="true">
          🔗
        </p>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full border border-border-subtle px-5 text-sm font-semibold transition-colors hover:bg-surface-2"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
