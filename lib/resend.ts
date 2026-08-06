import { Resend } from "resend";

let cached: Resend | null | undefined;

/**
 * Server-only Resend client. Returns null when RESEND_API_KEY isn't set yet —
 * callers degrade gracefully (503 from the dunning routes).
 */
export function createResend(): Resend | null {
  if (cached !== undefined) return cached;
  cached = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return cached;
}

/** Verifying secret for the Resend delivery webhook (Svix signature). */
export function getResendWebhookSecret(): string | null {
  return process.env.RESEND_WEBHOOK_SECRET ?? null;
}
