import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dashboard read side (Phase 14). Metrics per account:
 *  - recovered this month ($)
 *  - recovery rate (%)
 *  - at-risk MRR ($) — sum of open failed payments
 *  - open count
 * All money in cents; formatting is the UI's job.
 */

export interface PaymentRow {
  id: string;
  amount_due: number;
  status: string;
  decline_code: string | null;
  created_at: string;
}

export interface DashboardStats {
  recoveredCentsThisMonth: number;
  atRiskCents: number;
  openCount: number;
  resolvedCount: number;
  recoveryRatePct: number | null;
  payments: PaymentRow[];
}

export function sumCents(rows: Array<{ amount_due: number }>): number {
  return rows.reduce((acc, r) => acc + (r.amount_due ?? 0), 0);
}

/** Percentage 0-100 of payments that ended paid, or null when nothing resolved. */
export function recoveryRate(
  resolvedCount: number,
  paidCount: number,
): number | null {
  if (resolvedCount === 0) return null;
  return Math.round((paidCount / resolvedCount) * 1000) / 10;
}

export function computeStats(payments: PaymentRow[]): DashboardStats {
  const open = payments.filter((p) => p.status === "open");
  const resolved = payments.filter((p) => p.status !== "open");
  const paid = resolved.filter((p) => p.status === "paid");

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return {
    recoveredCentsThisMonth: sumCents(
      paid.filter((p) => new Date(p.created_at) >= monthStart),
    ),
    atRiskCents: sumCents(open),
    openCount: open.length,
    resolvedCount: resolved.length,
    recoveryRatePct: recoveryRate(resolved.length, paid.length),
    payments: payments.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    ),
  };
}

/** Load the most recent payments for the dashboard list (limited). */
export async function fetchRecentPayments(
  supabase: SupabaseClient,
  accountId: string,
  limit = 50,
): Promise<PaymentRow[]> {
  const rows = await fetchAccountPayments(supabase, accountId, limit);
  return rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/**
 * Load ALL open payments so at-risk MRR / open count are exact (not limited to
 * the list window).
 */
export async function fetchOpenPayments(
  supabase: SupabaseClient,
  accountId: string,
): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("failed_payments")
    .select(
      "id, amount_due, status, decline_code, created_at, customers!inner(account_id)",
    )
    .eq("customers.account_id", accountId)
    .eq("status", "open");

  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    amount_due: row.amount_due,
    status: row.status,
    decline_code: row.decline_code,
    created_at: row.created_at,
  }));
}

/** Load payments belonging to an account (through its customers). */
export async function fetchAccountPayments(
  supabase: SupabaseClient,
  accountId: string,
  limit?: number,
): Promise<PaymentRow[]> {
  let query = supabase
    .from("failed_payments")
    .select(
      "id, amount_due, status, decline_code, created_at, customers!inner(account_id)",
    )
    .eq("customers.account_id", accountId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    amount_due: row.amount_due,
    status: row.status,
    decline_code: row.decline_code,
    created_at: row.created_at,
  }));
}
