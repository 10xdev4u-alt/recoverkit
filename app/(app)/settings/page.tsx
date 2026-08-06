import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import { getTemplateOverrides } from "@/lib/template-store";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { TemplateEditor } from "@/components/settings/template-editor";

export const dynamic = "force-dynamic";

type AccountRow = {
  stripe_account_id: string | null;
  stripe_account_email: string | null;
  connected_at: string | null;
  dunning_from_email: string | null;
  dunning_reply_to: string | null;
  dunning_support_email: string | null;
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

  const resolved = await resolveAccount(supabase, user.id, user.email ?? undefined);
  if (!resolved) redirect("/sign-in");

  const { data } = await supabase
    .from("accounts")
    .select(
      "stripe_account_id, stripe_account_email, connected_at, dunning_from_email, dunning_reply_to, dunning_support_email",
    )
    .eq("id", resolved.id)
    .maybeSingle();
  const account = (data as AccountRow | null) ?? null;

  const overrides = await getTemplateOverrides(supabase, resolved.id);
  const connected = Boolean(account?.stripe_account_id);
  const banner = connect ? BANNERS[connect] : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">
        Settings
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
        Your store
      </h1>
      <p className="mt-4 max-w-md text-muted">
        Stripe connection, email voice, and the copy your customers receive.
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

      {/* Stripe connection */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Stripe connection
        </h2>
        <div className="mt-4 rounded-2xl border border-border-subtle bg-surface p-6">
          {connected ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full bg-good" aria-hidden="true" />
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
      </section>

      {/* Email settings */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Email settings
        </h2>
        <p className="mt-2 text-sm text-muted">
          Emails go out from your own domain, in your voice — RecoverKit stays
          invisible. Send-domain setup: add SPF + DKIM records at your email
          provider for{" "}
          <span className="font-mono text-foreground">
            {account?.dunning_from_email
              ? account.dunning_from_email.split("@")[1]
              : "yourdomain.com"}
          </span>
          .
        </p>
        <div className="mt-4 rounded-2xl border border-border-subtle bg-surface p-6">
          <EmailSettingsForm
            defaults={{
              fromEmail: account?.dunning_from_email ?? "",
              replyTo: account?.dunning_reply_to ?? "",
              supportEmail: account?.dunning_support_email ?? "",
            }}
          />
        </div>
      </section>

      {/* Template customization */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Email templates
        </h2>
        <p className="mt-2 text-sm text-muted">
          Edit the subject and intro line customers see. Leave a field empty to
          use the approved default copy.
        </p>
        <div className="mt-4 space-y-4">
          <TemplateEditor overrides={overrides} />
        </div>
      </section>
    </main>
  );
}
