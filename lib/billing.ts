import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripe } from "@/lib/stripe";

/**
 * Phase 23: RecoverKit's own billing ($29/mo platform subscription).
 *
 * This is the merchant's subscription TO RecoverKit — distinct from Stripe
 * Connect (their own account). A `plan_status` on the account row is the
 * source of truth for entitlements; Stripe webhooks own the writes.
 */

export type PlanStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "paused";

export interface BillingState {
  planStatus: PlanStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planPriceId: string | null;
  currentPeriodEnd: string | null;
}

/** The monthly price id from the Stripe dashboard ($29/mo). */
export function getMonthlyPriceId(): string | null {
  return process.env.STRIPE_PRICE_ID ?? null;
}

/** Map Stripe's subscription status onto our plan_status. */
export function mapStripeStatus(status: Stripe.Subscription.Status): PlanStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "unpaid";
    case "canceled":
      return "canceled";
    case "paused":
      return "paused";
    default:
      // incomplete / incomplete_expired — treat as free until it completes.
      return "free";
  }
}

/** Entitlement check: does this merchant currently have a paying plan? */
export function hasActivePlan(status: PlanStatus | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Read the billing state for an account (dashboard + route guards). */
export async function getBillingState(
  supabase: SupabaseClient,
  accountId: string,
): Promise<BillingState | null> {
  const { data } = await supabase
    .from("accounts")
    .select(
      "plan_status, stripe_customer_id, stripe_subscription_id, plan_price_id, current_period_end",
    )
    .eq("id", accountId)
    .maybeSingle();
  if (!data) return null;
  return {
    planStatus: (data.plan_status as PlanStatus) ?? "free",
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    planPriceId: data.plan_price_id,
    currentPeriodEnd: data.current_period_end,
  };
}

/* ------------------------------------------------------------------ */
/* Stripe session creation (platform account)                         */
/* ------------------------------------------------------------------ */

export async function createCheckoutSession(opts: {
  accountId: string;
  email: string;
  returnUrl: string;
  /** Existing platform customer to reuse (idempotent resubscribes). */
  customerId?: string | null;
}): Promise<{ url: string } | { error: string }> {
  const stripe = createStripe();
  const priceId = getMonthlyPriceId();
  if (!stripe || !priceId) {
    return { error: "Billing is not configured yet" };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: opts.customerId ?? undefined,
    customer_email: opts.customerId ? undefined : opts.email,
    client_reference_id: opts.accountId,
    subscription_data: { metadata: { account_id: opts.accountId } },
    success_url: `${opts.returnUrl}?billing=success`,
    cancel_url: `${opts.returnUrl}?billing=canceled`,
    allow_promotion_codes: true,
  });
  if (!session.url) return { error: "Could not start checkout" };
  return { url: session.url };
}

export async function createPortalSession(opts: {
  returnUrl: string;
  customerId: string;
}): Promise<{ url: string } | { error: string }> {
  const stripe = createStripe();
  if (!stripe) return { error: "Billing is not configured yet" };

  const session = await stripe.billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: `${opts.returnUrl}?billing=portal`,
  });
  if (!session.url) return { error: "Could not open billing portal" };
  return { url: session.url };
}

/* ------------------------------------------------------------------ */
/* Webhook sync (service role, RLS-bypassing)                         */
/* ------------------------------------------------------------------ */

/** Write billing fields from a Stripe subscription. Idempotent. */
export async function syncSubscription(
  supabase: SupabaseClient,
  accountId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  // stripe v22 types `current_period_end` on the item (the runtime also
  // returns it on the subscription itself — same value in practice).
  const periodEndSeconds =
    subscription.items?.data?.[0]?.current_period_end ?? null;

  const { error } = await supabase
    .from("accounts")
    .update({
      plan_status: mapStripeStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      plan_price_id: priceId,
      current_period_end: periodEndSeconds
        ? new Date(periodEndSeconds * 1000).toISOString()
        : null,
    })
    .eq("id", accountId);
  if (error) throw error;
}

/** Set the account back to free when a subscription is canceled/deleted. */
export async function clearSubscription(
  supabase: SupabaseClient,
  accountId: string,
): Promise<void> {
  const { error } = await supabase
    .from("accounts")
    .update({
      plan_status: "free",
      stripe_subscription_id: null,
      plan_price_id: null,
      current_period_end: null,
    })
    .eq("id", accountId);
  if (error) throw error;
}

/** Resolve which account a platform subscription belongs to. */
export async function resolveAccountForSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const metadataId = subscription.metadata?.account_id ?? null;
  if (metadataId) return metadataId;

  // Fallback: match the platform customer on the account row.
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);
  if (customerId) {
    const { data } = await supabase
      .from("accounts")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data) return data.id;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Webhook event dispatch (platform deliveries only)                 */
/* ------------------------------------------------------------------ */

/**
 * Phase 23: handle RecoverKit's OWN billing webhook events.
 *
 * These arrive on the platform webhook (no `stripe-account` header) and must
 * be routed here — NOT into the recovery engine, which would interpret a
 * platform `customer.subscription.updated` as a merchant dunning signal.
 * The webhook route decides by checking `stripeAccountHeader` / `event.account`.
 *
 * OPS: the platform webhook endpoint (STRIPE_WEBHOOK_SECRET) must have these
 * events enabled: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted. Without them billing never syncs.
 *
 * NOTE: other platform events (e.g. invoice.payment_failed for RecoverKit's
 * own invoices) intentionally fall through to `default`. The follow-up
 * customer.subscription.updated → past_due covers the failed-payment case;
 * do NOT route platform events into the recovery engine again.
 */
export async function handleBillingWebhookEvent(
  event: Stripe.Event,
  supabase: SupabaseClient,
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountId = session.client_reference_id;
      if (!accountId || typeof session.subscription !== "string") return;
      const stripe = createStripe();
      if (!stripe) return;
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );
      await syncSubscription(supabase, accountId, subscription);
      return;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = await resolveAccountForSubscription(supabase, subscription);
      if (!accountId) return;
      await syncSubscription(supabase, accountId, subscription);
      return;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = await resolveAccountForSubscription(supabase, subscription);
      if (!accountId) return;
      await clearSubscription(supabase, accountId);
      return;
    }
    default:
      return;
  }
}
