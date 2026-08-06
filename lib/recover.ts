import type { SupabaseClient } from "@supabase/supabase-js";
import { findToken, isTokenUsable, type RecoveryTokenRow } from "@/lib/tokens";

/**
 * Recovery session (Phases 12/13): resolves a raw magic-link token to the
 * failed payment, its customer and the merchant account — the data the
 * no-login card update page and finalize route act on.
 */

export interface RecoverySession {
  token: RecoveryTokenRow;
  payment: {
    id: string;
    amount_due: number;
    stripe_invoice_id: string;
    status: string;
    decline_code: string | null;
  };
  customer: {
    id: string;
    email: string;
    stripe_customer_id: string;
  };
  account: {
    id: string | null;
    stripe_account_id: string | null;
    stripe_access_token: string | null;
  } | null;
}

interface PaymentRow {
  id: string;
  amount_due: number;
  stripe_invoice_id: string;
  status: string;
  decline_code: string | null;
}

interface CustomerRow {
  id: string;
  email: string;
  stripe_customer_id: string;
  account_id: string;
}

/**
 * Resolve and validate a token. Returns null when the token is unknown,
 * expired or already used. Throws when the DB is unavailable.
 */
export async function resolveRecoverySession(
  supabase: SupabaseClient,
  rawToken: string,
): Promise<RecoverySession | null> {
  const found = await findToken(supabase, rawToken);
  if (!found) return null;
  if (!isTokenUsable(found.token)) return null;
  if (!found.payment || !found.customer) return null;

  const payment = found.payment as PaymentRow;
  const customer = found.customer as CustomerRow;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, stripe_account_id, stripe_access_token")
    .eq("id", customer.account_id)
    .maybeSingle();

  return {
    token: found.token,
    payment: {
      id: payment.id,
      amount_due: payment.amount_due,
      stripe_invoice_id: payment.stripe_invoice_id,
      status: payment.status,
      decline_code: payment.decline_code,
    },
    customer: {
      id: customer.id,
      email: customer.email,
      stripe_customer_id: customer.stripe_customer_id,
    },
    account:
      (account as {
        id: string | null;
        stripe_account_id: string | null;
        stripe_access_token: string | null;
      } | null) ?? null,
  };
}
