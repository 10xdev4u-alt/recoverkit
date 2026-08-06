import { NextResponse } from "next/server";
import {
  renderRecoveryConfirmation,
  renderTemplate,
} from "@/lib/email";

const TEMPLATES = ["expired_card", "insufficient_funds", "generic"] as const;

/**
 * Phase 15: template preview route. GET /api/emails/[id]/preview where
 * [id] is a template key (expired_card | insufficient_funds | generic |
 * recovery). Used by the settings/email-log UI to show what a merchant's
 * customers receive. Renders static sample copy.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = {
    product: "Your store",
    firstName: "Jordan",
    amount: "$29.00",
    date: "Aug 6, 2026",
    updateUrl: "https://yourstore.com/recover/token",
    supportEmail: "support@yourstore.com",
  };

  let html: string;
  if (id === "recovery") {
    html = await renderRecoveryConfirmation(ctx);
  } else if ((TEMPLATES as readonly string[]).includes(id)) {
    html = await renderTemplate(id as (typeof TEMPLATES)[number], ctx);
  } else {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
