import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { createStripe } from "@/lib/stripe";
import { resolveRecoverySession } from "@/lib/recover";
import { consumeToken } from "@/lib/tokens";
import { createResend } from "@/lib/resend";
import { renderRecoveryConfirmation } from "@/lib/email";
import { defaultBranding } from "@/lib/dunning";
import { formatAmount } from "@/lib/dunning-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Phase 13: finalize recovery (TECHNICAL.md §5).
 *
 * 1. Validate the token + the paymentMethodId belongs to this customer.
 * 2. Attach the payment method and set it as the invoice default.
 * 3. Pay every open invoice immediately (better UX than waiting on Stripe).
 * 4. Atomically consume the token (single-use).
 * 5. Fire the recovery-confirmation email (best effort).
 *
 * Idempotent: consuming the token is atomic, so a duplicate request after a
 * success is a no-op that still reports success.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Throttle bursts — this route charges invoices.
  if (!rateLimit(`finalize:${clientIp(request)}:${token}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let paymentMethodId: string | null = null;
  try {
    const body = (await request.json()) as { payment_method_id?: string };
    paymentMethodId = body.payment_method_id ?? null;
  } catch {
    // fall through — paymentMethodId stays null → 400 below
  }
  if (!paymentMethodId) {
    return NextResponse.json(
      { error: "Missing payment method" },
      { status: 400 },
    );
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

  const client =
    createStripe(session.account?.stripe_access_token ?? undefined) ?? stripe;
  const customerId = session.customer.stripe_customer_id;

  // Already resolved (duplicate delivery of a successful finalize) → success.
  if (session.payment.status !== "open") {
    return NextResponse.json({ ok: true, alreadyResolved: true });
  }

  try {
    // 1+2. Verify ownership, attach if needed, and make it the default.
    // Note: a confirmed SetupIntent already attaches the PM to the customer,
    // so attach() should only run when it's genuinely unattached — calling it
    // on an already-attached PM makes Stripe throw (resource_already_exists).
    const pm = await client.paymentMethods.retrieve(paymentMethodId);
    // Reject only when the PM is attached to a *different* customer; an
    // unattached PM (null) or one already on this customer is fine.
    if (pm.customer && pm.customer !== customerId) {
      return NextResponse.json(
        { error: "Payment method does not match this account" },
        { status: 400 },
      );
    }
    if (!pm.customer) {
      await client.paymentMethods.attach(paymentMethodId, { customer: customerId });
    }
    await client.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3. Pay every open invoice now.
    let open: Stripe.ApiList<Stripe.Invoice> | null = null;
    try {
      open = await client.invoices.list({ customer: customerId, status: "open" });
    } catch {
      open = null;
    }
    const paidInvoiceIds: string[] = [];
    for (const invoice of open?.data ?? []) {
      try {
        await client.invoices.pay(invoice.id);
        paidInvoiceIds.push(invoice.id);
      } catch {
        // A specific invoice may still fail (e.g. balance requirement) — pay
        // the rest; the webhook will reconcile the record either way.
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not finalize payment" },
      { status: 500 },
    );
  }

  // 4. Consume the token — atomic single-use guard.
  const consumed = await consumeToken(supabase, session.token.id);
  if (!consumed) {
    return NextResponse.json({ error: "Link already used" }, { status: 409 });
  }

  // 5. Best-effort confirmation email (white-labeled, no CTA).
  try {
    const resend = createResend();
    if (resend) {
      // Resolve merchant branding (product name) from the account row.
      let product: string | null = null;
      if (session.account?.id) {
        const { data: acct } = await supabase
          .from("accounts")
          .select("name")
          .eq("id", session.account.id)
          .maybeSingle();
        product = (acct as { name: string | null } | null)?.name ?? null;
      }
      const branding = defaultBranding(product);
      const { data } = await resend.emails.send({
        from: `Billing at ${branding.product} <${branding.fromEmail}>`,
        replyTo: branding.replyTo,
        to: [session.customer.email],
        subject: `All sorted ✅ — thanks for keeping ${branding.product} running`,
        html: await renderRecoveryConfirmation({
          product: branding.product,
          firstName: null,
          amount: formatAmount(session.payment.amount_due),
        }),
      });
      if (data?.id) {
        await supabase.from("email_events").insert({
          failed_payment_id: session.payment.id,
          resend_email_id: data.id,
          event_type: "sent",
          template: "recovery_confirmation",
        });
      }
    }
  } catch {
    // Non-fatal — the recovery itself already succeeded.
  }

  return NextResponse.json({ ok: true });
}
