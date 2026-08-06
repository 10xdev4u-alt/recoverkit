import { createServerClient } from "@/lib/supabase/server";
import { resolveRecoverySession } from "@/lib/recover";
import { defaultBranding } from "@/lib/dunning";
import { formatAmount } from "@/lib/dunning-helpers";
import { CardUpdateForm } from "@/components/recover/card-update-form";
import { ExpiredLink } from "@/components/recover/expired-link";

export const dynamic = "force-dynamic";

/**
 * Phase 12: the no-login card update page (TECHNICAL.md §5).
 *
 * The URL carries a single-use magic-link token. The page validates it
 * server-side (hash, TTL, unused, payment still open) and only then renders
 * the Stripe card form — no login, scoped to one customer's payment.
 */
export default async function RecoverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServerClient();

  let session: Awaited<ReturnType<typeof resolveRecoverySession>> = null;
  let branding = defaultBranding(null);
  if (supabase) {
    session = await resolveRecoverySession(supabase, token);
  }

  if (!session) {
    return (
      <ExpiredLink
        title="This link has expired"
        message="Payment links expire after 7 days or once they've been used. Your plan is safe — if you still have an outstanding balance, you'll receive a fresh link by email."
      />
    );
  }

  if (session.account?.id && supabase) {
    const { data: acct } = await supabase
      .from("accounts")
      .select("name")
      .eq("id", session.account.id)
      .maybeSingle();
    branding = defaultBranding(
      (acct as { name: string | null } | null)?.name ?? null,
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          {branding.product}
        </p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          Update your payment method
        </h1>
        <p className="mt-4 text-muted">
          Add a new card for{" "}
          <span className="font-semibold text-foreground">
            {formatAmount(session.payment.amount_due)}
          </span>
          . Your {branding.product} access doesn&apos;t change — we&apos;ll charge
          the outstanding balance automatically.
        </p>

        <CardUpdateForm token={token} />
      </div>
    </main>
  );
}
