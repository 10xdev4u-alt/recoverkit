import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServerClient } from "@/lib/supabase/server";
import { getResendWebhookSecret } from "@/lib/resend";

/**
 * Resend delivery webhook (Phase 10).
 *
 * Verifies the Svix signature (RESEND_WEBHOOK_SECRET), then records
 * delivered/opened/clicked/bounced against the matching email_events row
 * (matched by resend_email_id). The unique (resend_email_id, event_type)
 * index makes duplicate deliveries a no-op.
 */

const EVENT_MAP: Record<string, "delivered" | "opened" | "clicked" | "bounced"> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
};

export async function POST(request: Request) {
  const secret = getResendWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Resend webhooks are not configured yet" },
      { status: 503 },
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured yet" },
      { status: 503 },
    );
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await request.text();

  let payload: {
    type?: string;
    data?: { email_id?: string; created_at?: string };
  };
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = payload.type;
  const mapped = eventType ? EVENT_MAP[eventType] : undefined;
  const emailId = payload.data?.email_id;

  if (!mapped || !emailId) {
    // Unhandled event (e.g. email.sent — we already record that at send time).
    return NextResponse.json({ received: true });
  }

  // Resolve the originating failed payment from the 'sent' row we persisted
  // at send time (email_events.failed_payment_id is NOT NULL).
  const { data: sent } = await supabase
    .from("email_events")
    .select("failed_payment_id")
    .eq("resend_email_id", emailId)
    .eq("event_type", "sent")
    .maybeSingle();
  if (!sent) {
    // Unknown email id — nothing to track (or the sent row was never written).
    return NextResponse.json({ received: true });
  }

  const { error } = await supabase.from("email_events").upsert(
    {
      failed_payment_id: sent.failed_payment_id,
      resend_email_id: emailId,
      event_type: mapped,
      payload: payload.data,
    },
    { onConflict: "resend_email_id,event_type", ignoreDuplicates: true },
  );
  if (error) {
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
