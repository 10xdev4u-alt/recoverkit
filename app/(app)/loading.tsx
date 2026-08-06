/**
 * Phase 19: route-level loading skeleton for the dashboard group. Shown while
 * server components fetch — a neutral shell (header bars) that fits every page
 * in the group instead of a blank flash.
 */
export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10" aria-busy="true">
      <div className="h-3 w-24 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-4 h-9 w-64 animate-pulse rounded-xl bg-surface-2" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-surface-2" />

      <div className="mt-10 space-y-6">
        <div className="h-5 w-40 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl border border-border-subtle bg-surface" />
        <div className="h-5 w-40 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-56 animate-pulse rounded-2xl border border-border-subtle bg-surface" />
      </div>
    </main>
  );
}
