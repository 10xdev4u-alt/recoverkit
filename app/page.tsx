export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">
        Failed payment recovery that pays for itself
      </p>
      <h1 className="max-w-2xl text-5xl font-bold tracking-tight">
        RecoverKit
      </h1>
      <p className="max-w-md text-muted">
        Flat $29/mo Stripe dunning for indie SaaS. Decline-code-aware emails,
        no-login card updates, and a dashboard that shows the MRR you saved.
      </p>
      <span className="rounded-full border border-border-subtle px-3 py-1 text-xs text-muted">
        Phase 0 · validation mode
      </span>
    </main>
  );
}
