import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createStripe, getStripeWebhookUrl } from "@/lib/stripe";

const WEBHOOK_EVENTS = [
  "invoice.payment_failed",
  "invoice.payment_succeeded",
  "customer.subscription.updated",
  "charge.failed",
] as const;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (oauthError) {
    return NextResponse.redirect(
      new URL("/settings?connect=declined", base),
      303,
    );
  }
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing authorization code or state" },
      { status: 400 },
    );
  }

  const stripe = createStripe();
  const supabase = createServerClient();
  if (!stripe || !supabase) {
    return NextResponse.json(
      { error: "Stripe Connect is not configured yet" },
      { status: 503 },
    );
  }

  try {
    const oauth = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    if (!oauth.access_token || !oauth.stripe_user_id) {
      throw new Error("OAuth response missing tokens");
    }

    // Best-effort: pull the connected account's email for the settings UI.
    let accountEmail: string | null = null;
    try {
      const connected = createStripe(oauth.access_token);
      const account = await connected?.accounts.retrieve(
        oauth.stripe_user_id,
      );
      accountEmail = account?.email ?? null;
    } catch {
      // Non-fatal — the connection is still recorded.
    }

    // Best-effort: register a webhook endpoint on the connected account so
    // its dunning events reach /api/webhooks/stripe (Phase 6). Non-fatal —
    // connect still succeeds; webhook delivery can be fixed in Settings.
    let webhookSecret: string | null = null;
    try {
      const webhookUrl = getStripeWebhookUrl();
      if (webhookUrl) {
        const connected = createStripe(oauth.access_token);
        const endpoint = await connected?.webhookEndpoints.create({
          url: webhookUrl,
          enabled_events: [...WEBHOOK_EVENTS],
        });
        webhookSecret = endpoint?.secret ?? null;
      }
    } catch {
      // Non-fatal.
    }

    const { data, error: updateError } = await supabase
      .from("accounts")
      .update({
        stripe_account_id: oauth.stripe_user_id,
        stripe_access_token: oauth.access_token,
        stripe_refresh_token: oauth.refresh_token ?? null,
        stripe_account_email: accountEmail,
        stripe_webhook_secret: webhookSecret,
        connected_at: new Date().toISOString(),
      })
      .eq("id", state)
      .select("id")
      .single();
    if (updateError || !data) throw new Error("Could not save connection");

    return NextResponse.redirect(
      new URL("/settings?connect=success", base),
      303,
    );
  } catch {
    return NextResponse.redirect(
      new URL("/settings?connect=error", base),
      303,
    );
  }
}
