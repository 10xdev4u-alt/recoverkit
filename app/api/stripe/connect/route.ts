import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import {
  createStripe,
  getStripeClientId,
  getStripeRedirectUri,
} from "@/lib/stripe";

export async function GET() {
  const stripe = createStripe();
  const clientId = getStripeClientId();
  const redirectUri = getStripeRedirectUri();
  const supabase = createServerClient();
  const userSupabase = await createUserClient();

  if (!stripe || !clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Stripe Connect is not configured yet" },
      { status: 503 },
    );
  }
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured yet" },
      { status: 503 },
    );
  }

  try {
    // Phase 14: the OAuth state is the authenticated user's account id.
    const {
      data: { user },
    } = await userSupabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(
        new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? ""),
        303,
      );
    }
    const account = await resolveAccount(
      userSupabase,
      user.id,
      user.email ?? undefined,
    );
    if (!account) {
      return NextResponse.json(
        { error: "Could not resolve your account" },
        { status: 500 },
      );
    }
    const state = account.id;
    const url = stripe.oauth.authorizeUrl({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state,
    });
    return NextResponse.redirect(url, 303);
  } catch {
    return NextResponse.json(
      { error: "Could not start Stripe Connect" },
      { status: 500 },
    );
  }
}
