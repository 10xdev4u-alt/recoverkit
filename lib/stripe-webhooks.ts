import Stripe from "stripe";
import { createStripe } from "@/lib/stripe";

/** Platform-level webhook signing secret (whsec_...), from `stripe listen` locally. */
export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

/**
 * Verify a webhook delivery with the raw body + `Stripe-Signature` header.
 * Throws when the signature is invalid (or the payload was tampered with).
 */
export function constructStripeEvent(
  rawBody: string,
  signature: string | null,
  secret: string,
): Stripe.Event {
  const stripe = createStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  if (!signature) throw new Error("Missing Stripe-Signature header");
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
