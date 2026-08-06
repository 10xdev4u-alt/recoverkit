import { MockDashboard } from "./mock-dashboard";
import { WaitlistForm } from "./waitlist-form";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-28">
        <div>
          <p className="reveal inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            $29/mo flat · no MRR tiers · no quote calls
          </p>

          <h1
            className="reveal mt-6 font-display text-5xl font-medium leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Never lose another{" "}
            <span className="italic text-accent">failed payment.</span>
          </h1>

          <p
            className="reveal mt-6 max-w-md text-lg leading-relaxed text-muted"
            style={{ animationDelay: "160ms" }}
          >
            RecoverKit chases the card failures Stripe leaves behind —
            decline-aware emails, no-login card update links, and a dashboard
            that proves every dollar it saved you.
          </p>

          <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: "240ms" }}>
            <a
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-background transition-all hover:bg-accent-strong hover:shadow-[0_0_24px_rgb(198_242_78/0.35)] active:scale-[0.98]"
            >
              Open your dashboard
            </a>
            <a
              href="#waitlist"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border-subtle px-7 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Join the waitlist
            </a>
          </div>

          <p
            className="reveal mt-4 text-xs text-muted/80"
            style={{ animationDelay: "320ms" }}
          >
            Live now. Connect Stripe in 5 minutes — first 50 founders keep
            founding-member pricing at $29/mo.
          </p>

          <div className="reveal mt-8" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-widest text-muted/70">
                or get early-access updates
              </span>
              <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
            </div>
            {/* id="waitlist" lives here so the anchor scroll lands on the form */}
            <div id="waitlist" className="mt-4 scroll-mt-20">
              <WaitlistForm id="hero" />
            </div>
          </div>
        </div>

        <div className="reveal" style={{ animationDelay: "200ms" }}>
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}
