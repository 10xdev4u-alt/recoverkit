import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Magic-link token service (Phase 11, docs/TECHNICAL.md §5).
 *
 * Security model:
 *  - 32 random bytes → hex raw token (only ever in the email link).
 *  - SHA-256 hash stored at rest — a DB leak does not expose usable tokens.
 *  - 7-day TTL, single-use (used_at set on consumption).
 *  - Scoped to one failed payment, so the recovery page only ever acts on
 *    that customer's payment.
 */

export interface RecoveryTokenRow {
  id: string;
  customer_id: string;
  failed_payment_id: string | null;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
}

export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (TECHNICAL.md §5)

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function isTokenExpired(token: Pick<RecoveryTokenRow, "expires_at">): boolean {
  return new Date(token.expires_at).getTime() <= Date.now();
}

export function isTokenUsable(
  token: Pick<RecoveryTokenRow, "expires_at" | "used_at">,
  now: Date = new Date(),
): boolean {
  return !token.used_at && new Date(token.expires_at).getTime() > now.getTime();
}

/** Create a fresh magic-link token for a failed payment. */
export async function createRecoveryToken(
  supabase: SupabaseClient,
  customerId: string,
  failedPaymentId: string,
): Promise<{ raw: string; hash: string } | null> {
  const raw = generateRawToken();
  const hash = hashToken(raw);
  const { error } = await supabase.from("recovery_tokens").insert({
    customer_id: customerId,
    failed_payment_id: failedPaymentId,
    token_hash: hash,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (error) return null;
  return { raw, hash };
}

/** Look up a token by its raw value (hash-compared), with its payment + customer. */
export async function findToken(
  supabase: SupabaseClient,
  raw: string,
): Promise<{
  token: RecoveryTokenRow;
  payment: {
    id: string;
    amount_due: number;
    stripe_invoice_id: string;
    status: string;
    decline_code: string | null;
  } | null;
  customer: { email: string } | null;
} | null> {
  const { data: token } = await supabase
    .from("recovery_tokens")
    .select("*")
    .eq("token_hash", hashToken(raw))
    .maybeSingle();

  if (!token) return null;

  const [payment, customer] = await Promise.all([
    token.failed_payment_id
      ? supabase
          .from("failed_payments")
          .select(
            "id, amount_due, stripe_invoice_id, status, decline_code",
          )
          .eq("id", token.failed_payment_id)
          .maybeSingle()
      : { data: null },
    supabase.from("customers").select("email").eq("id", token.customer_id).maybeSingle(),
  ]);

  return {
    token,
    payment: payment?.data ?? null,
    customer: customer?.data ?? null,
  };
}

/** Atomically mark a token consumed — returns false when already used (single-use). */
export async function consumeToken(
  supabase: SupabaseClient,
  tokenId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("recovery_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  return !error && !!data;
}
