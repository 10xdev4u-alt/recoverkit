import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripe } from "@/lib/stripe";

/**
 * Stripe's Invoice type doesn't declare `payment_intent` (webhook payloads
 * carry it as an id or expanded object) — widen it for the handler.
 */
type WebhookInvoice = Stripe.Invoice & {
  payment_intent?: Stripe.PaymentIntent | string | null;
};

/**
 * Recovery record engine (Phase 7).
 *
 * Maps Stripe dunning events to `failed_payments` rows via the atomic
 * `upsert_failed_payment` RPC (never downgrade, stale-event safe). The mapping
 * functions are pure so the webhook → record table can be unit-tested.
 */

export interface FailedPaymentRecord {
  customerId: string;
  stripeInvoiceId: string;
  stripeSubscriptionId: string | null;
  amountDue: number;
  attemptCount: number;
  declineCode: string | null;
  /** Matches failed_payments.status check constraint (open | paid | void | uncollectible). */
  status: "open" | "paid" | "void" | "uncollectible";
  nextPaymentAttempt: string | null;
  /** charge.failed doesn't know Stripe's retry schedule — preserve existing. */
  setNextAttempt: boolean;
  eventCreated: number;
}

interface AccountRow {
  id: string;
  stripe_access_token: string | null;
}

/** Minimal shapes of the Stripe objects we read (keeps mappers unit-testable). */
interface PaymentFailedInput {
  id: string;
  subscription?: string | object | null;
  customer?: string | object | null;
  amount_due?: number | null;
  attempt_count?: number | null;
  next_payment_attempt?: number | null;
  payment_intent?: string | object | null;
}

function asId(value: string | object | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if ("id" in value && typeof value.id === "string") return value.id;
  return null;
}

interface PaymentSucceededInput {
  id: string;
  subscription?: string | object | null;
  customer?: string | object | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  attempt_count?: number | null;
}

interface ChargeFailedInput {
  id: string;
  invoice?: string | object | null;
  customer?: string | object | null;
  amount?: number | null;
  failure_code?: string | null;
  outcome?: { network_status?: string | null } | null;
}

/* ------------------------------------------------------------------ */
/* Pure mapping (unit-tested)                                         */
/* ------------------------------------------------------------------ */

function extractDeclineCode(
  paymentIntent: string | object | null | undefined,
): string | null {
  if (!paymentIntent || typeof paymentIntent === "string") return null;
  const error = (paymentIntent as Stripe.PaymentIntent).last_payment_error;
  return error?.decline_code ?? error?.code ?? null;
}

export function mapPaymentFailed(
  invoice: PaymentFailedInput,
  eventCreated: number,
  customerId: string,
): FailedPaymentRecord {
  return {
    customerId,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: asId(invoice.subscription),
    amountDue: invoice.amount_due ?? 0,
    attemptCount: invoice.attempt_count ?? 1,
    declineCode: extractDeclineCode(invoice.payment_intent),
    status: "open",
    nextPaymentAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
    setNextAttempt: true,
    eventCreated,
  };
}

export function mapPaymentSucceeded(
  invoice: PaymentSucceededInput,
  eventCreated: number,
  customerId: string,
): FailedPaymentRecord {
  return {
    customerId,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: asId(invoice.subscription),
    amountDue: invoice.amount_paid ?? invoice.amount_due ?? 0,
    attemptCount: invoice.attempt_count ?? 1,
    declineCode: null,
    status: "paid",
    nextPaymentAttempt: null,
    setNextAttempt: true,
    eventCreated,
  };
}

export function mapChargeFailed(
  charge: ChargeFailedInput,
  eventCreated: number,
  customerId: string,
): FailedPaymentRecord {
  const invoiceId = typeof charge.invoice === "string" ? charge.invoice : null;
  return {
    customerId,
    // One-off charges (no invoice) get their own unique dedupe key.
    stripeInvoiceId: invoiceId ?? `charge:${charge.id}`,
    stripeSubscriptionId: null,
    amountDue: charge.amount ?? 0,
    attemptCount: 1,
    declineCode: charge.failure_code ?? charge.outcome?.network_status ?? null,
    status: "open",
    nextPaymentAttempt: null,
    setNextAttempt: false,
    eventCreated,
  };
}

/* ------------------------------------------------------------------ */
/* DB helpers                                                         */
/* ------------------------------------------------------------------ */

async function resolveAccountRow(
  supabase: SupabaseClient,
  stripeAccountId: string | null | undefined,
): Promise<AccountRow> {
  if (stripeAccountId) {
    const { data } = await supabase
      .from("accounts")
      .select("id, stripe_access_token")
      .eq("stripe_account_id", stripeAccountId)
      .maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase
    .from("accounts")
    .select("id, stripe_access_token")
    .limit(1)
    .maybeSingle();
  if (data) return data;

  const { data: created, error } = await supabase
    .from("accounts")
    .insert({ name: "RecoverKit" })
    .select("id, stripe_access_token")
    .single();
  if (error) throw error;
  return created;
}

/** Export shared with lib/backfill.ts (Phase 17). */
export async function ensureCustomer(
  supabase: SupabaseClient,
  accountId: string,
  stripeCustomerId: string,
  email: string,
): Promise<string> {
  const { data: inserted } = await supabase
    .from("customers")
    .upsert(
      { account_id: accountId, stripe_customer_id: stripeCustomerId, email },
      { onConflict: "stripe_customer_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (inserted) return inserted.id;

  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (!existing) throw new Error("Customer lookup failed");
  return existing.id;
}

/** Export shared with lib/backfill.ts (Phase 17). */
export async function callUpsert(
  supabase: SupabaseClient,
  record: FailedPaymentRecord,
): Promise<void> {
  const { error } = await supabase.rpc("upsert_failed_payment", {
    p_customer_id: record.customerId,
    p_stripe_invoice_id: record.stripeInvoiceId,
    p_stripe_subscription_id: record.stripeSubscriptionId,
    p_amount_due: record.amountDue,
    p_attempt_count: record.attemptCount,
    p_decline_code: record.declineCode,
    p_status: record.status,
    p_next_payment_attempt: record.nextPaymentAttempt,
    p_set_next_attempt: record.setNextAttempt,
    p_event_created: record.eventCreated,
  });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Event handlers                                                     */
/* ------------------------------------------------------------------ */

async function handlePaymentFailed(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const invoice = event.data.object as WebhookInvoice;
  const accountRow = await resolveAccountRow(supabase, event.account ?? null);
  const stripe = createStripe(accountRow.stripe_access_token ?? undefined);

  // Webhook payloads usually carry payment_intent/customer as plain ids —
  // expand them to read the decline code and email.
  let paymentIntent: string | object | null = invoice.payment_intent ?? null;
  let customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? null);
  let customerEmail: string | null = null;

  if (
    stripe &&
    (typeof paymentIntent === "string" || typeof invoice.customer === "string")
  ) {
    const expand: string[] = [];
    if (typeof paymentIntent === "string") expand.push("payment_intent");
    if (typeof invoice.customer === "string") expand.push("customer");
    try {
      const expanded = (await stripe.invoices.retrieve(invoice.id, {
        expand,
      })) as WebhookInvoice & {
        customer?: Stripe.Customer;
      };
      if (expanded.payment_intent) paymentIntent = expanded.payment_intent;
      if (expanded.customer) {
        customerId = expanded.customer.id ?? customerId;
        customerEmail = expanded.customer.email ?? null;
      }
    } catch {
      // Best-effort — fall back to whatever the payload carried.
    }
  }

  if (!customerId) return;
  const customerRowId = await ensureCustomer(
    supabase,
    accountRow.id,
    customerId,
    customerEmail ?? customerId,
  );
  await callUpsert(
    supabase,
    mapPaymentFailed(
      { ...invoice, payment_intent: paymentIntent },
      event.created,
      customerRowId,
    ),
  );
}

async function handlePaymentSucceeded(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const accountRow = await resolveAccountRow(supabase, event.account ?? null);
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer?.id ?? null);
  if (!customerId) return;
  const customerRowId = await ensureCustomer(
    supabase,
    accountRow.id,
    customerId,
    customerId,
  );
  await callUpsert(
    supabase,
    mapPaymentSucceeded(invoice, event.created, customerRowId),
  );
}

async function handleSubscriptionUpdated(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  // Final-failure detection (TECHNICAL.md §3): Stripe gave up — stop dunning.
  if (subscription.status === "unpaid" || subscription.status === "canceled") {
    const { error } = await supabase
      .from("failed_payments")
      .update({ status: "void", updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id)
      .eq("status", "open");
    if (error) throw error;
  }
}

async function handleChargeFailed(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const accountRow = await resolveAccountRow(supabase, event.account ?? null);
  const customerId =
    typeof charge.customer === "string"
      ? charge.customer
      : (charge.customer?.id ?? null);
  if (!customerId) return;
  const customerRowId = await ensureCustomer(
    supabase,
    accountRow.id,
    customerId,
    customerId,
  );
  await callUpsert(
    supabase,
    mapChargeFailed(charge, event.created, customerRowId),
  );
}

/** Dispatch a verified webhook event to the recovery engine. Idempotent. */
export async function handleWebhookEvent(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  switch (event.type) {
    case "invoice.payment_failed":
      return handlePaymentFailed(event, supabase);
    case "invoice.payment_succeeded":
      return handlePaymentSucceeded(event, supabase);
    case "customer.subscription.updated":
      return handleSubscriptionUpdated(event, supabase);
    case "charge.failed":
      return handleChargeFailed(event, supabase);
    default:
      return;
  }
}
