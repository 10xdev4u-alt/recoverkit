import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { selectDuePayments, type FailedPaymentRow } from "@/lib/scheduler";
import {
  getDunningState,
  isNudgeDue,
  sendDunningEmail,
} from "@/lib/dunning";
import { logAudit } from "@/lib/audit";

/**
 * Daily cron (vercel.json, `0 1 * * *` — Hobby accounts allow one run/day):
 *  1. computes the decline-aware dunning plan for every due open failed
 *     payment and SENDS the email (Phase 10 — mints a magic-link token +
 *     persists the 'sent' event),
 *  2. nudges payments whose update link was never clicked 48h after the
 *     first email,
 * and only locks the records we actually acted on so nothing double-fires
 * but failures retry next run.
 */
export async function GET(request: Request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET` when configured.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Scheduler is not configured yet" },
      { status: 503 },
    );
  }

  const { data: payments, error } = await supabase
    .from("failed_payments")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "Could not read failed payments" },
      { status: 500 },
    );
  }

  const now = new Date();
  const due = selectDuePayments((payments ?? []) as FailedPaymentRow[], now);

  const sent: string[] = [];
  const results: Array<{
    failedPaymentId: string;
    ok: boolean;
    reason?: string;
  }> = [];

  for (const payment of due) {
    // First-email-only rule: the due pass sends the FIRST email per payment
    // (on the decline-code delay). Re-sends are owned by the nudge pass below
    // (48h no-click). Without this, a daily cron re-emails every open payment
    // every day, ignoring whether the customer already clicked or updated.
    const state = await getDunningState(supabase, payment.id);
    if (state.lastSentAt !== null) {
      results.push({
        failedPaymentId: payment.id,
        ok: false,
        reason: "already_emailed",
      });
      continue;
    }

    // Resolve the customer (and their account) for this payment.
    const { data: customer } = await supabase
      .from("customers")
      .select("id, email, account_id")
      .eq("id", payment.customer_id)
      .maybeSingle();
    if (!customer) {
      results.push({
        failedPaymentId: payment.id,
        ok: false,
        reason: "no_customer",
      });
      continue;
    }

    const { ok, reason } = await sendDunningEmail(
      supabase,
      {
        id: payment.id,
        amount_due: payment.amount_due,
        decline_code: payment.decline_code,
        status: payment.status,
      },
      { id: customer.id, email: customer.email },
      customer.account_id,
    );

    results.push({ failedPaymentId: payment.id, ok, reason });
    if (ok) sent.push(payment.id);
    else if (reason) {
      // Phase 19: surface send failures so an operator can investigate.
      await logAudit(supabase, {
        accountId: customer.account_id,
        actor: "system",
        action: "dunning.send_failed",
        entityType: "failed_payment",
        entityId: payment.id,
        meta: { reason, customerEmail: customer.email },
      });
    }
  }

  // Nudge pass: first email sent >48h ago, link never clicked → re-send.
  const nudged: string[] = [];
  const nudgeSkip = new Set(sent);
  for (const payment of payments ?? []) {
    if (nudgeSkip.has(payment.id) || payment.status !== "open") continue;
    const state = await getDunningState(supabase, payment.id);
    if (!isNudgeDue(state, now)) continue;

    const { data: customer } = await supabase
      .from("customers")
      .select("id, email, account_id")
      .eq("id", payment.customer_id)
      .maybeSingle();
    if (!customer) continue;

    const { ok } = await sendDunningEmail(
      supabase,
      {
        id: payment.id,
        amount_due: payment.amount_due,
        decline_code: payment.decline_code,
        status: payment.status,
      },
      { id: customer.id, email: customer.email },
      customer.account_id,
    );
    if (ok) nudged.push(payment.id);
  }

  // Lock only the records we emailed — failed sends retry on the next run.
  const locked = [...sent, ...nudged];
  if (locked.length > 0) {
    const { error: lockError } = await supabase
      .from("failed_payments")
      .update({ last_scheduled_at: now.toISOString() })
      .in("id", locked)
      .eq("status", "open");
    if (lockError) {
      return NextResponse.json(
        { error: "Could not lock scheduled payments" },
        { status: 500 },
      );
    }
  }

  // Phase 20: monitoring — ping the configured endpoint so uptime services
  // can alert when the daily cron stops running. Best-effort, non-fatal.
  const monitoringUrl = process.env.MONITORING_URL;
  if (monitoringUrl) {
    try {
      await fetch(monitoringUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent: sent.length, nudged: nudged.length }),
        signal: AbortSignal.timeout(5_000),
      });
    } catch {
      // Non-fatal — the cron result stands on its own.
    }
  }

  return NextResponse.json({ sent: sent.length, nudged: nudged.length, results });
}
