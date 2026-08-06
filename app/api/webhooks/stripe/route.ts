import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  constructStripeEvent,
  getStripeWebhookSecret,
} from "@/lib/stripe-webhooks";
import { handleWebhookEvent } from "@/lib/recovery";
import { logAudit } from "@/lib/audit";

/**
 * Stripe webhook endpoint.
 *
 * Order of operations (retry-safe):
 *   1. Verify signature against the correct secret (per-account when the
 *      delivery carries the connected account, else the platform secret).
 *   2. If this event_id is already in the ledger → it was already processed →
 *      200 immediately (Stripe retries after non-2xx are deduped here).
 *   3. Dispatch to the recovery engine FIRST, then record the ledger. If
 *      dispatch throws we return 500 so Stripe retries; the engine is
 *      idempotent, so the retry converges. Recording after dispatch means a
 *      failed dispatch can never be swallowed by a duplicate-delivery 200.
 *   4. Return 2xx fast.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const stripeAccountHeader = request.headers.get("stripe-account");

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Webhooks are not configured yet" },
      { status: 503 },
    );
  }

  const secret = await resolveSecret(
    rawBody,
    stripeAccountHeader,
    supabase,
  );
  if (!secret) {
    return NextResponse.json(
      { error: "Webhooks are not configured yet" },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    event = constructStripeEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency ledger: already processed?
  const { data: existing } = await supabase
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Dispatch first — throws bubble up as 500 so Stripe retries.
  try {
    await handleWebhookEvent(event, supabase);
  } catch (dispatchError) {
    // Phase 19: alert the account owner via the audit trail, then rethrow so
    // Stripe retries (dispatch is idempotent and converges on retry).
    const accountId = await resolveAccountId(stripeAccountHeader, supabase);
    if (accountId) {
      await logAudit(supabase, {
        accountId,
        actor: "stripe",
        action: "webhook.dispatch_failed",
        entityType: "stripe_event",
        entityId: event.id,
        meta: {
          type: event.type,
          error:
            dispatchError instanceof Error
              ? dispatchError.message
              : String(dispatchError),
        },
      });
    }
    throw dispatchError;
  }

  // Record after dispatch; ON CONFLICT DO NOTHING makes concurrent
  // duplicate deliveries safe. A failed ledger write returns 500 so Stripe
  // retries and converges (dispatch is idempotent).
  const { error: ledgerError } = await supabase
    .from("webhook_events")
    .upsert(
      { event_id: event.id, type: event.type, created: event.created },
      { onConflict: "event_id", ignoreDuplicates: true },
    );
  if (ledgerError) {
    return NextResponse.json(
      { error: "Could not record event" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Pick the signing secret for this delivery:
 * - deliveries from a connected account carry `stripe-account` (header) or an
 *   `account` field (body) → use that account's per-account webhook secret
 * - platform deliveries → STRIPE_WEBHOOK_SECRET
 */
async function resolveSecret(
  rawBody: string,
  stripeAccountHeader: string | null,
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
): Promise<string | null> {
  let connectedAccountId = stripeAccountHeader;
  if (!connectedAccountId) {
    try {
      const parsed = JSON.parse(rawBody) as { account?: string };
      connectedAccountId = parsed.account ?? null;
    } catch {
      // ignore — malformed body will fail signature verification anyway
    }
  }

  if (connectedAccountId) {
    const { data } = await supabase
      .from("accounts")
      .select("stripe_webhook_secret")
      .eq("stripe_account_id", connectedAccountId)
      .maybeSingle();
    if (data?.stripe_webhook_secret) return data.stripe_webhook_secret;
  }

  return getStripeWebhookSecret();
}

/** Resolve our internal account uuid for a connected Stripe account id. */
async function resolveAccountId(
  stripeAccountHeader: string | null,
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
): Promise<string | null> {
  if (!stripeAccountHeader) return null;
  const { data } = await supabase
    .from("accounts")
    .select("id")
    .eq("stripe_account_id", stripeAccountHeader)
    .maybeSingle();
  return data?.id ?? null;
}
