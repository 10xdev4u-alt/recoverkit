import Link from "next/link";
import { createUserClient } from "@/lib/supabase/ssr";
import { redirect } from "next/navigation";
import { resolveAccount } from "@/lib/account";
import {
  computeStats,
  fetchOpenPayments,
  fetchRecentPayments,
} from "@/lib/stats";
import { DeclineBadge } from "@/components/dashboard/decline-badge";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { formatAmount } from "@/lib/dunning-helpers";

export const dynamic = "force-dynamic";

/**
 * Phase 14: dashboard (read side). Auth-scoped — RLS + the account resolver
 * guarantee a merchant only ever sees their own payments.
 */
export default async function DashboardPage() {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const account = await resolveAccount(supabase, user.id, user.email ?? undefined);
  if (!account) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="text-muted">Could not load your account.</p>
      </main>
    );
  }

  // Phase 22: setup-checklist state — Stripe linked, sender configured,
  // any recovery already recorded.
  const { data: setupRow } = await supabase
    .from("accounts")
    .select("stripe_account_id, dunning_from_email, dunning_support_email")
    .eq("id", account.id)
    .maybeSingle();
  const setup = {
    stripeConnected: Boolean(setupRow?.stripe_account_id),
    emailConfigured: Boolean(
      setupRow?.dunning_from_email || setupRow?.dunning_support_email,
    ),
    hasRecovered: false,
  } as const;

  // List window (latest 50) + exact aggregates over ALL open payments — at-risk
  // MRR and open count must not undercount when there are 50+ failures.
  const recent = await fetchRecentPayments(supabase, account.id);
  const open = await fetchOpenPayments(supabase, account.id);
  const listStats = computeStats(recent);
  const stats = {
    ...listStats,
    atRiskCents: open.reduce((acc, p) => acc + p.amount_due, 0),
    openCount: open.length,
  };

  // A resolved (non-open) payment counts as a recovery — at least the flow
  // has completed once, so the checklist's third step is done.
  const setupState = {
    ...setup,
    hasRecovered: listStats.resolvedCount > 0,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        {account.name}
      </p>
      <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
        Revenue protection
      </h1>
      <p className="mt-2 text-sm text-muted">
        The failed payments RecoverKit recovered — and the ones still in play.
      </p>

      {/* Metric cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Recovered this month"
          value={formatAmount(stats.recoveredCentsThisMonth)}
          tone="good"
        />
        <MetricCard
          label="Recovery rate"
          value={
            stats.recoveryRatePct === null
              ? "—"
              : `${stats.recoveryRatePct}%`
          }
        />
        <MetricCard
          label="At-risk MRR"
          value={formatAmount(stats.atRiskCents)}
          tone="bad"
        />
        <MetricCard label="Open failures" value={String(stats.openCount)} />
      </div>

      {/* Phase 22: guided setup until the account is fully wired */}
      {(!setupState.stripeConnected ||
        !setupState.emailConfigured ||
        !setupState.hasRecovered) && <SetupChecklist state={setupState} />}

      {/* Payments list */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Failed payments
        </h2>
        {recent.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-border-subtle bg-surface p-10 text-center">
            <p className="text-sm text-muted">
              No failed payments yet — connect Stripe in Settings and RecoverKit
              will start watching.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border-subtle bg-surface">
            {recent.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/payments/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="tnum text-sm font-semibold">
                      {formatAmount(p.amount_due)}
                    </span>
                    <DeclineBadge code={p.decline_code} />
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "open"
                          ? "bg-bad/10 text-bad"
                          : p.status === "paid"
                            ? "bg-good/10 text-good"
                            : "bg-muted/10 text-muted"
                      }`}
                    >
                      {p.status}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {new Date(p.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`tnum mt-2 font-display text-2xl font-semibold tracking-tight ${
          tone === "good"
            ? "text-good"
            : tone === "bad"
              ? "text-bad"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
