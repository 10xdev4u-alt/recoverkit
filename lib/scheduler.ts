import { getRetryPolicy } from "@/lib/decline-codes";

/**
 * Retry scheduler (Phase 8).
 *
 * Stripe's Smart Retries already own the *charge* retry schedule — we layer
 * the *dunning email* schedule on top, keyed to the decline-code family
 * (docs/EMAIL_TEMPLATES.md §5):
 *
 *   card_update codes      → email immediately (retries are futile)
 *   insufficient_funds     → ~24-48h window (user may top up)
 *   processing_error       → ~24h, safe to auto-retry
 *   fraudulent             → email now, no auto-retry
 *   generic declines       → ~24h
 */

export type SchedulerAction =
  | "email_card_update"
  | "email_retry"
  | "email_generic"
  | "none";

export interface FailedPaymentRow {
  id: string;
  customer_id: string;
  amount_due: number;
  status: string;
  decline_code: string | null;
  created_at: string;
  updated_at: string;
  last_scheduled_at: string | null;
}

export interface Plan {
  action: SchedulerAction;
  chargeRetry: boolean;
  dueAt: Date;
  reason: string;
}

/** When did the record's most recent dunning-relevant state change happen? */
function baseTime(payment: FailedPaymentRow): Date {
  return new Date(payment.updated_at ?? payment.created_at);
}

/**
 * The action plan for a single open failed payment. The email is *due* once
 * `emailDelayHours` have passed since the last failed attempt.
 */
export function planAction(payment: FailedPaymentRow): Plan {
  const policy = getRetryPolicy(payment.decline_code);
  const dueAt = new Date(
    baseTime(payment).getTime() + policy.emailDelayHours * 3_600_000,
  );

  let action: SchedulerAction;
  switch (policy.emailTemplate) {
    case "expired_card":
      action = "email_card_update";
      break;
    case "insufficient_funds":
      action = "email_retry";
      break;
    default:
      action = "email_generic";
  }

  return { action, chargeRetry: policy.chargeRetry, dueAt, reason: policy.label };
}

export function isDue(payment: FailedPaymentRow, now: Date = new Date()): boolean {
  return planAction(payment).dueAt.getTime() <= now.getTime();
}

/**
 * Filter open payments to those whose dunning action is due and hasn't been
 * scheduled in the last hour (idempotency window for the hourly cron).
 */
export function selectDuePayments(
  payments: FailedPaymentRow[],
  now: Date = new Date(),
  dedupeWindowMs: number = 3_600_000,
): FailedPaymentRow[] {
  return payments.filter((p) => {
    if (p.last_scheduled_at) {
      const last = new Date(p.last_scheduled_at).getTime();
      if (now.getTime() - last < dedupeWindowMs) return false;
    }
    return isDue(p, now);
  });
}
