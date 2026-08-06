import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import {
  createCheckoutSession,
  createPortalSession,
  getBillingState,
  hasActivePlan,
} from "@/lib/billing";
import { logAudit } from "@/lib/audit";

/**
 * Phase 23: start a $29/mo Checkout Session for the caller's account.
 * Authenticated; redirects the browser straight to Stripe.
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

  // Entitlement guard: anyone who already has a platform customer should NOT
  // open a second checkout — that would create a duplicate subscription on
  // top of a delinquent (past_due/unpaid) one. Route them to the portal to
  // fix their payment method first instead.
  if (
    state?.stripeCustomerId &&
    (hasActivePlan(state.planStatus) ||
      state.planStatus === "past_due" ||
      state.planStatus === "unpaid" ||
      state.planStatus === "paused")
  ) {
    const portal = await createPortalSession({
      returnUrl: `${base}/settings`,
      customerId: state.stripeCustomerId,
    });
    if ("url" in portal) {
      await logAudit(supabase, {
        accountId: account.id,
        actor: "user",
        actorId: user.id,
        action: "billing.checkout_skipped",
        entityType: "account",
        entityId: account.id,
        meta: { reason: "customer_exists", planStatus: state.planStatus },
      });
      return NextResponse.redirect(portal.url, 303);
    }
  }

  const result = await createCheckoutSession({
    accountId: account.id,
    email: user.email ?? "",
    returnUrl: `${base}/settings`,
    customerId: state?.stripeCustomerId ?? null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  await logAudit(supabase, {
    accountId: account.id,
    actor: "user",
    actorId: user.id,
    action: "billing.checkout_started",
    entityType: "account",
    entityId: account.id,
  });

  return NextResponse.redirect(result.url, 303);
}
