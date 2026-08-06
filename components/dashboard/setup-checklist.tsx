import Link from "next/link";

/**
 * Phase 22: first-run setup checklist. Shown on the dashboard until the
 * merchant has completed every step — turns the empty state into a guided
 * path from "just signed up" to "actively recovering".
 */

export interface SetupState {
  stripeConnected: boolean;
  emailConfigured: boolean;
  hasRecovered: boolean;
}

export function SetupChecklist({
  state,
}: {
  state: SetupState;
}) {
  const steps = [
    {
      done: state.stripeConnected,
      n: "01",
      title: "Connect Stripe",
      copy: state.stripeConnected
        ? "Your Stripe account is linked — failed invoices are being watched."
        : "Link your Stripe account so RecoverKit can see failed payments.",
      href: "/settings",
      cta: state.stripeConnected ? "Manage" : "Connect Stripe",
    },
    {
      done: state.emailConfigured,
      n: "02",
      title: "Set your email voice",
      copy: state.emailConfigured
        ? "Dunning emails go out from your own domain."
        : "Choose the from-address your recovery emails send as.",
      href: "/settings",
      cta: state.emailConfigured ? "Edit" : "Set up email",
    },
    {
      done: state.hasRecovered,
      n: "03",
      title: "Watch the first recovery",
      copy: state.hasRecovered
        ? "RecoverKit has already saved you money."
        : "When a payment fails, we email the customer a no-login card update link automatically.",
      href: "/dashboard",
      cta: state.hasRecovered ? "View dashboard" : "See how it works",
    },
  ];

  const complete = steps.filter((s) => s.done).length;

  return (
    <section
      className="mt-8 rounded-2xl border border-border-subtle bg-surface p-6"
      aria-label="Setup checklist"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">
            Set up RecoverKit
          </h2>
          <p className="mt-1 text-sm text-muted">
            {complete === steps.length
              ? "You're all set — RecoverKit is recovering for you."
              : `${complete} of ${steps.length} steps done.`}
          </p>
        </div>

        {/* Progress ring-ish bar */}
        <div
          className="flex h-2 w-40 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={complete}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-label={`${complete} of ${steps.length} setup steps complete`}
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(complete / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
              s.done
                ? "border-good/20 bg-good/5"
                : "border-border-subtle bg-surface-2"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  s.done
                    ? "bg-good/15 text-good"
                    : "bg-surface text-muted"
                }`}
                aria-hidden="true"
              >
                {s.done ? "✓" : s.n}
              </span>
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">{s.copy}</p>
              </div>
            </div>
            <Link
              href={s.href}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                s.done
                  ? "border border-border-subtle text-muted hover:bg-surface-2 hover:text-foreground"
                  : "bg-accent text-background hover:bg-accent-strong"
              }`}
            >
              {s.cta}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
