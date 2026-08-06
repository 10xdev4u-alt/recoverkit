import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  callUpsert,
  ensureCustomer,
  mapPaymentFailed,
} from "@/lib/recovery";

/**
 * Stripe backfill (Phase 17). When a merchant connects their Stripe account
 * we seed `failed_payments` with their recent failed + open invoices so the
 * dashboard shows history immediately. Idempotent: reuses the atomic
 * `upsert_failed_payment` RPC (deduped on stripe_invoice_id, stale-event
 * safe), so re-running never double-inserts. Bounded (single page, capped)
 * and sequential to stay rate-limit friendly.
 */

export interface BackfillResult {
  scanned: number;
  seeded: number;
  skipped: number;
  errors: number;
}

/**
 * Backfill recent failed + open invoices for a connected account.
 * - open invoices with attempt_count >= 1 (Stripe is still retrying)
 * - closed void/uncollectible invoices that previously failed (history)
 * Decline codes come inline via `expand` — no per-invoice API round-trips.
 */
export async function backfillFailedPayments(
  supabase: SupabaseClient,
  accountId: string,
  stripe: Stripe,
  opts: { limit?: number } = {},
): Promise<BackfillResult> {
  const limit = opts.limit ?? 50;
  const result: BackfillResult = { scanned: 0, seeded: 0, skipped: 0, errors: 0 };

  const fetched: Stripe.Invoice[] = [];
  for (const status of ["open", "void", "uncollectible"] as const) {
    try {
      const page = await stripe.invoices.list({
        status,
        limit,
        expand: ["data.payment_intent"],
      });
      fetched.push(...page.data);
    } catch {
      // Non-fatal — skip this status bucket.
    }
  }

  for (const invoice of fetched) {
    result.scanned++;
    // Only invoices that actually failed at least once are relevant to dunning.
    if ((invoice.attempt_count ?? 0) < 1) {
      result.skipped++;
      continue;
    }

    const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
    if (!customerId) {
      result.skipped++;
      continue;
    }

    const customerRowId = await ensureCustomer(
      supabase,
      accountId,
      customerId,
      typeof invoice.customer_email === "string" ? invoice.customer_email : customerId,
    );
    if (!customerRowId) {
      result.errors++;
      continue;
    }

    const record = mapPaymentFailed(
      invoice as unknown as Stripe.Invoice & {
        payment_intent?: Stripe.PaymentIntent | string | null;
      },
      invoice.created,
      customerRowId,
    );
    // mapPaymentFailed already extracts the decline code from the expanded PI.
    record.status = invoice.status === "open" ? "open" : "void";

    try {
      await callUpsert(supabase, record);
      result.seeded++;
    } catch {
      result.errors++;
    }
  }

  return result;
}
