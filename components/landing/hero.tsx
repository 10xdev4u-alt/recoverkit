import { MockDashboard } from "./mock-dashboard";
import { WaitlistForm } from "./waitlist-form";

export function Hero() {
  return (
    <section id="waitlist" className="relative overflow-hidden">
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

          <div className="reveal mt-8" style={{ animationDelay: "240ms" }}>
            <WaitlistForm id="hero" />
          </div>

          <p
            className="reveal mt-4 text-xs text-muted/80"
            style={{ animationDelay: "320ms" }}
          >
            Connect Stripe in 5 minutes. First 50 founders get founding-member
            pricing.
          </p>
        </div>

        <div className="reveal" style={{ animationDelay: "200ms" }}>
          <MockDashboard />
        </div>
      </div>
    </section>
  );
}
