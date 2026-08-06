import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";

export const dynamic = "force-dynamic";

type AccountRow = {
  stripe_account_id: string | null;
  stripe_account_email: string | null;
  connected_at: string | null;
};

const BANNERS: Record<string, { tone: "good" | "bad"; text: string }> = {
  success: { tone: "good", text: "Stripe connected — RecoverKit is now watching for failed payments." },
  declined: { tone: "bad", text: "Connection cancelled — no changes were made." },
  error: { tone: "bad", text: "Something went wrong while connecting Stripe. Try again." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const { connect } = await searchParams;

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const resolved = await resolveAccount(
    supabase,
    user.id,
    user.email ?? undefined,
  );
  if (!resolved) redirect("/sign-in");

  const { data } = await supabase
    .from("accounts")
    .select("stripe_account_id, stripe_account_email, connected_at")
    .eq("id", resolved.id)
    .maybeSingle();
  const account = (data as AccountRow | null) ?? null;

  const connected = Boolean(account?.stripe_account_id);
  const banner = connect ? BANNERS[connect] : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        Settings
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
        Stripe connection
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Link your Stripe account so RecoverKit can watch for failed payments,
        send decline-aware emails, and recover revenue.
      </p>

      {banner && (
        <p
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            banner.tone === "good"
              ? "border-good/30 bg-good/10 text-good"
              : "border-bad/30 bg-bad/10 text-bad"
          }`}
        >
          {banner.text}
        </p>
      )}

      <div className="mt-10 rounded-2xl border border-border-subtle bg-surface p-6">
        {connected ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="h-2 w-2 rounded-full bg-good"
                  aria-hidden="true"
                />
                Connected
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                {account?.stripe_account_id}
              </p>
              {account?.stripe_account_email && (
                <p className="mt-1 text-sm text-muted">
                  {account.stripe_account_email}
                </p>
              )}
            </div>
            <a
              href="/api/stripe/connect"
              className="rounded-full border border-border-subtle px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Reconnect
            </a>
          </div>
        ) : (
          <a
            href="/api/stripe/connect"
            className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-sm font-semibold text-background transition-all hover:bg-accent-strong active:scale-[0.98]"
          >
            Connect Stripe account
          </a>
        )}
      </div>
    </main>
  );
}
