import { NextResponse } from "next/server";
import {
  renderRecoveryConfirmation,
  renderTemplate,
} from "@/lib/email";

/**
 * Render a template to HTML for local preview (Phase 9 exit criterion).
 * GET /api/emails/preview?template=expired_card|insufficient_funds|generic|recovery
 * Guarded to non-production so the preview never ships as a public route.
 */
const TEMPLATES = ["expired_card", "insufficient_funds", "generic"] as const;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const template = new URL(request.url).searchParams.get("template") ?? "expired_card";
  const ctx = {
    product: "Acme",
    firstName: "Jordan",
    amount: "$29.00",
    date: "Aug 6, 2026",
    updateUrl: "https://acme.com/recover/token",
    supportEmail: "support@acme.com",
  };

  let html: string;
  if (template === "recovery") {
    html = await renderRecoveryConfirmation(ctx);
  } else if ((TEMPLATES as readonly string[]).includes(template)) {
    html = await renderTemplate(template as (typeof TEMPLATES)[number], ctx);
  } else {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
