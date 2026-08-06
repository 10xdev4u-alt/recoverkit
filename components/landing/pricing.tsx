import { WaitlistForm } from "./waitlist-form";

const includes = [
  "Unlimited recovered revenue",
  "No MRR tiers — $5K and $500K pay the same",
  "Decline-code-aware emails + retry schedule",
  "No-login card update pages",
  "ROI dashboard (“we saved you $X”)",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="relative mx-auto max-w-6xl px-6 pb-28 pt-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-72 max-w-lg rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-lg rounded-3xl border border-accent/25 bg-surface p-8 shadow-[0_24px_80px_-32px_rgb(0_0_0/0.9)]">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Founding-member pricing
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="tnum font-display text-6xl font-semibold tracking-tight">
            $29
          </span>
          <span className="text-sm text-muted">/ month · flat</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Pay it back with a single recovered payment.
        </p>

        <ul className="mt-6 space-y-2.5">
          {includes.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-0.5 text-accent"
                aria-hidden="true"
              >
                ✓
              </span>
              <span className="text-muted">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <a
            href="/dashboard"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Start recovering
          </a>
          <p className="mt-3 text-center text-xs text-muted">
            Product&apos;s live — sign in and connect Stripe in 5 minutes.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
            <span className="text-[10px] uppercase tracking-widest text-muted/70">
              or join the waitlist
            </span>
            <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <WaitlistForm id="pricing" />
          </div>
        </div>

        <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-muted/70">
          Churnkey starts at $250/mo · Stunning scales with your MRR. We don&apos;t.
        </p>
      </div>
    </section>
  );
}
