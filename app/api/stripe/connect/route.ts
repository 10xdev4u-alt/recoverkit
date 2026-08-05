import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import {
  createStripe,
  getStripeClientId,
  getStripeRedirectUri,
} from "@/lib/stripe";

/**
 * A single default account until dashboard auth lands (Phase 14).
 * TODO(phase 14): resolve the account from the authenticated session instead.
 */
async function getDefaultAccountId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  const { data: created, error: createError } = await supabase
    .from("accounts")
    .insert({ name: "RecoverKit" })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

export async function GET() {
  const stripe = createStripe();
  const clientId = getStripeClientId();
  const redirectUri = getStripeRedirectUri();
  const supabase = createServerClient();

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
    const state = await getDefaultAccountId(supabase);
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
