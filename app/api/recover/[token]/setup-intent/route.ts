import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createStripe } from "@/lib/stripe";
import { resolveRecoverySession } from "@/lib/recover";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Phase 12: mint a SetupIntent for the magic-link card update page.
 *
 * Validates the token (hash, TTL, single-use) and returns a client_secret for
 * the mapped Stripe customer. Acts on the connected account when the merchant
 * has linked one, else the platform account.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Throttle bursts (SetupIntent creation costs Stripe API calls).
  if (!rateLimit(`setup:${clientIp(request)}:${token}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const supabase = createServerClient();
  const stripe = createStripe();
  if (!supabase || !stripe) {
    return NextResponse.json(
      { error: "Recovery is not configured yet" },
      { status: 503 },
    );
  }

  const session = await resolveRecoverySession(supabase, token);
  if (!session) {
    return NextResponse.json({ error: "Link is invalid or expired" }, { status: 404 });
  }
  if (session.payment.status !== "open") {
    return NextResponse.json(
      { error: "This payment has already been resolved" },
      { status: 409 },
    );
  }

  // Act on the merchant's connected account when present.
  const client =
    createStripe(session.account?.stripe_access_token ?? undefined) ?? stripe;

  try {
    const setupIntent = await client.setupIntents.create({
      customer: session.customer.stripe_customer_id,
      automatic_payment_methods: { enabled: true },
    });
    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch {
    return NextResponse.json(
      { error: "Could not prepare the card form" },
      { status: 500 },
    );
  }
}
