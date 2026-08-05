import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Server-only Stripe client (platform account).
 * Pass `apiKey` to act on behalf of a connected account; otherwise the platform
 * secret key is used. Returns null when not configured — callers should degrade
 * gracefully (e.g. a 503 from the connect routes).
 */
export function createStripe(apiKey?: string): Stripe | null {
  const key = apiKey ?? process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (apiKey) return new Stripe(apiKey);
  if (cached !== undefined) return cached;
  cached = new Stripe(key);
  return cached;
}

/** The platform's Connect client id (ca_...), from the Stripe dashboard. */
export function getStripeClientId(): string | null {
  return process.env.STRIPE_CLIENT_ID ?? null;
}

/**
 * The redirect URI Stripe sends the browser back to after authorization.
 * Must be registered exactly in the Stripe platform settings
 * (http for localhost, https in production).
 */
export function getStripeRedirectUri(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return base ? `${base}/api/stripe/connect/callback` : null;
}

/** The webhook URL per-account endpoints forward connected-account events to. */
export function getStripeWebhookUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return base ? `${base}/api/webhooks/stripe` : null;
}
