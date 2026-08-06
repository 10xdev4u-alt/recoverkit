import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import { createPortalSession, getBillingState } from "@/lib/billing";
import { logAudit } from "@/lib/audit";

/**
 * Phase 23: open the Stripe billing portal for the caller's account
 * (manage / cancel the $29/mo subscription). Authenticated.
 */
export async function POST() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", base), 303);
  }

  const account = await resolveAccount(supabase, user.id, user.email ?? undefined);
  if (!account) {
    return NextResponse.json({ error: "Could not resolve your account" }, { status: 500 });
  }

  const state = await getBillingState(supabase, account.id);
  if (!state?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription to manage" },
      { status: 400 },
    );
  }

  const result = await createPortalSession({
    returnUrl: `${base}/settings`,
    customerId: state.stripeCustomerId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  await logAudit(supabase, {
    accountId: account.id,
    actor: "user",
    actorId: user.id,
    action: "billing.portal_opened",
    entityType: "account",
    entityId: account.id,
  });

  return NextResponse.redirect(result.url, 303);
}
