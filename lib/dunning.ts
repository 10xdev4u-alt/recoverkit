import type { SupabaseClient } from "@supabase/supabase-js";
import { getRetryPolicy, type EmailTemplateKey } from "@/lib/decline-codes";
import { createResend } from "@/lib/resend";
import { createRecoveryToken } from "@/lib/tokens";
import { renderTemplate } from "@/lib/email";
import { pickSubject } from "@/lib/subjects";
import {
  buildUpdateUrl,
  formatAmount,
  formatDate,
  type DunningState,
} from "@/lib/dunning-helpers";
import type { TemplateOverrides } from "@/lib/template-store";

export { isNudgeDue, NUDGE_WINDOW_MS } from "@/lib/dunning-helpers";
export type { DunningState } from "@/lib/dunning-helpers";

/**
 * Dunning sequence engine (Phase 10).
 *
 * Given a due failed payment, this:
 *  1. Routes to a template by decline-code family (EMAIL_TEMPLATES.md table).
 *  2. Mints a fresh single-use magic-link token (Phase 11) for the update URL.
 *  3. Sends via Resend, white-labeled from the merchant.
 *  4. Persists an email_events('sent') row — the Resend webhook appends
 *     delivered/opened/clicked/bounced against the same resend_email_id.
 */

export interface DunningBranding {
  product: string;
  fromEmail: string;
  replyTo: string;
  supportEmail: string;
  appUrl: string;
}

export interface DunningPayment {
  id: string;
  amount_due: number;
  decline_code: string | null;
  status: string;
}

export interface DunningCustomer {
  id: string;
  email: string;
}

export interface SendResult {
  ok: boolean;
  template: EmailTemplateKey | null;
  emailId?: string;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/* Default branding (env-driven until Phase 16 settings ship)          */
/* ------------------------------------------------------------------ */

export function defaultBranding(accountName: string | null): DunningBranding {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const product = accountName ?? "RecoverKit";
  const fromEmail =
    process.env.DUNNING_FROM_EMAIL ??
    `billing@${new URL(appUrl).hostname.replace(/^www\./, "")}`;
  return {
    product,
    fromEmail,
    replyTo: process.env.DUNNING_REPLY_TO ?? fromEmail,
    supportEmail: process.env.DUNNING_SUPPORT_EMAIL ?? fromEmail,
    appUrl,
  };
}

/* ------------------------------------------------------------------ */
/* Send                                                                */
/* ------------------------------------------------------------------ */

interface AccountRow {
  name: string | null;
  dunning_from_email: string | null;
  dunning_reply_to: string | null;
  dunning_support_email: string | null;
}

async function resolveBranding(
  supabase: SupabaseClient,
  accountId: string | null,
): Promise<DunningBranding> {
  if (accountId) {
    const { data } = await supabase
      .from("accounts")
      .select(
        "name, dunning_from_email, dunning_reply_to, dunning_support_email",
      )
      .eq("id", accountId)
      .maybeSingle();
    const row = data as AccountRow | null;
    const base = defaultBranding(row?.name ?? null);
    return {
      product: base.product,
      fromEmail: row?.dunning_from_email ?? base.fromEmail,
      replyTo: row?.dunning_reply_to ?? base.replyTo,
      supportEmail: row?.dunning_support_email ?? base.supportEmail,
      appUrl: base.appUrl,
    };
  }
  return defaultBranding(null);
}

interface AccountContext {
  branding: DunningBranding;
  overrides: TemplateOverrides;
}

/**
 * Fetch branding + template overrides for an account in ONE query (the cron
 * loop calls this per payment — keep DB round-trips down).
 */
async function resolveAccountContext(
  supabase: SupabaseClient,
  accountId: string | null,
): Promise<AccountContext> {
  const branding = await resolveBranding(supabase, accountId);
  if (!accountId) return { branding, overrides: {} };

  const { data } = await supabase
    .from("accounts")
    .select("template_overrides")
    .eq("id", accountId)
    .maybeSingle();
  const raw = (data as { template_overrides: unknown } | null)?.template_overrides;
  const overrides =
    raw && typeof raw === "object" ? (raw as TemplateOverrides) : {};
  return { branding, overrides };
}

/**
 * Send the dunning email for one payment. Returns ok=false with a reason when
 * the email isn't due, Resend isn't configured, or the send failed.
 */
export async function sendDunningEmail(
  supabase: SupabaseClient,
  payment: DunningPayment,
  customer: DunningCustomer,
  accountId: string | null,
): Promise<SendResult> {
  const resend = createResend();
  if (!resend) return { ok: false, template: null, reason: "not_configured" };
  if (payment.status !== "open") {
    return { ok: false, template: null, reason: "not_open" };
  }

  const { branding, overrides } = await resolveAccountContext(
    supabase,
    accountId,
  );
  const policy = getRetryPolicy(payment.decline_code);
  const template: EmailTemplateKey = policy.emailTemplate;

  // Mint a fresh magic-link token (single-use, 7-day TTL).
  const token = await createRecoveryToken(supabase, customer.id, payment.id);
  if (!token) return { ok: false, template, reason: "token_error" };

  // Phase 16: apply the merchant's saved copy overrides (subject + intro).
  const override = overrides[template];

  const updateUrl = buildUpdateUrl(branding.appUrl, token.raw);
  const ctx = {
    product: branding.product,
    firstName: null,
    amount: formatAmount(payment.amount_due),
    date: formatDate(new Date()),
    updateUrl,
    supportEmail: branding.supportEmail,
    customSubject: override?.subject,
    customIntro: override?.body,
  };

  const { data, error } = await resend.emails.send({
    from: `Billing at ${branding.product} <${branding.fromEmail}>`,
    replyTo: branding.replyTo,
    to: [customer.email],
    subject: pickSubject(template, branding.product, override?.subject),
    html: await renderTemplate(template, ctx),
  });
  if (error) return { ok: false, template, reason: `send_error: ${error.name}` };

  // Persist the 'sent' event — the Resend webhook matches back by email_id.
  const { error: dbError } = await supabase.from("email_events").insert({
    failed_payment_id: payment.id,
    resend_email_id: data?.id ?? null,
    event_type: "sent",
    template,
  });
  if (dbError) {
    // Email was delivered but tracking failed — don't fail the cron for it.
    return { ok: true, template, emailId: data?.id, reason: "tracking_error" };
  }

  return { ok: true, template, emailId: data?.id };
}

/**
 * Load the dunning state (last sent + whether any email was clicked) for a
 * failed payment, straight from email_events.
 */
export async function getDunningState(
  supabase: SupabaseClient,
  failedPaymentId: string,
): Promise<DunningState> {
  const { data: events } = await supabase
    .from("email_events")
    .select("event_type, created_at")
    .eq("failed_payment_id", failedPaymentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!events || events.length === 0) {
    return { lastSentAt: null, hasClicked: false };
  }

  const lastSent = events.find((e) => e.event_type === "sent");
  return {
    lastSentAt: lastSent?.created_at ?? null,
    hasClicked: events.some((e) => e.event_type === "clicked"),
  };
}
