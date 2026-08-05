import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  planAction,
  selectDuePayments,
  type FailedPaymentRow,
} from "@/lib/scheduler";

/**
 * Hourly cron (vercel.json): computes the decline-aware dunning plan for every
 * due open failed payment and marks it scheduled so nothing double-fires.
 *
 * Phase 10 (dunning engine) consumes `last_scheduled_at != null` records to
 * actually send the emails.
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
  const actions = due.map((p) => ({
    failedPaymentId: p.id,
    ...planAction(p),
  }));

  // Lock: mark scheduled so the next hourly run skips these.
  if (actions.length > 0) {
    const { error: lockError } = await supabase
      .from("failed_payments")
      .update({ last_scheduled_at: now.toISOString() })
      .in(
        "id",
        actions.map((a) => a.failedPaymentId),
      )
      .eq("status", "open");
    if (lockError) {
      return NextResponse.json(
        { error: "Could not lock scheduled payments" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ scheduled: actions.length, actions });
}
