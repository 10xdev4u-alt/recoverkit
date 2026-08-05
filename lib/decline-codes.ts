/**
 * Decline-code routing (docs/EMAIL_TEMPLATES.md routing table + TECHNICAL.md §2).
 *
 * Every Stripe decline code maps to a recovery family, and every family maps to
 * an email template + delay + whether automatic charge retries are safe.
 */

export type DeclineFamily =
  | "card_update"
  | "insufficient_funds"
  | "processing_error"
  | "fraudulent"
  | "generic";

export type EmailTemplateKey = "expired_card" | "insufficient_funds" | "generic";

export interface RetryPolicy {
  emailTemplate: EmailTemplateKey;
  /** Hours after the failed attempt before the dunning email is due. */
  emailDelayHours: number;
  /** Whether Stripe's automatic retries are safe for this code. */
  chargeRetry: boolean;
  label: string;
}

/** Codes where retries are futile — the customer must update the card first. */
const CARD_UPDATE_CODES = new Set([
  "expired_card",
  "incorrect_cvc",
  "incorrect_number",
  "stolen_card",
  "lost_card",
]);

// EMAIL_TEMPLATES.md routing table assigns restricted_card / approval_not_allowed
// to the generic template (~24h) even though the action is a card update.
const GENERIC_CODES = new Set([
  "card_declined",
  "do_not_honor",
  "generic_decline",
  "restricted_card",
  "approval_not_allowed",
]);

export function classifyDecline(code: string | null | undefined): DeclineFamily {
  if (!code) return "generic";
  if (CARD_UPDATE_CODES.has(code)) return "card_update";
  if (code === "insufficient_funds") return "insufficient_funds";
  if (code === "processing_error") return "processing_error";
  if (code === "fraudulent") return "fraudulent";
  if (GENERIC_CODES.has(code)) return "generic";
  // Unknown code → generic catch-all template.
  return "generic";
}

const POLICIES: Record<DeclineFamily, RetryPolicy> = {
  card_update: {
    emailTemplate: "expired_card",
    emailDelayHours: 0,
    chargeRetry: false,
    label: "card update required — email immediately",
  },
  insufficient_funds: {
    emailTemplate: "insufficient_funds",
    emailDelayHours: 24, // 24-48h window (EMAIL_TEMPLATES §5)
    chargeRetry: true,
    label: "insufficient funds — 24h window, retry safe",
  },
  processing_error: {
    emailTemplate: "generic",
    emailDelayHours: 24,
    chargeRetry: true,
    label: "transient error — short retry window",
  },
  fraudulent: {
    emailTemplate: "generic",
    emailDelayHours: 0,
    chargeRetry: false,
    label: "suspected fraud — email now, no auto retry",
  },
  generic: {
    emailTemplate: "generic",
    emailDelayHours: 24,
    chargeRetry: true,
    label: "bank declined — 24h window",
  },
};

export function getRetryPolicy(
  code: string | null | undefined,
): RetryPolicy {
  return POLICIES[classifyDecline(code)];
}
