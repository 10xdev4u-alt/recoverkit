import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/ssr";
import { createServerClient } from "@/lib/supabase/server";
import { resolveAccount } from "@/lib/account";
import {
  isTemplateKey,
  saveTemplateOverride,
  type TemplateOverride,
} from "@/lib/template-store";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Phase 16: save merchant email settings + per-template copy overrides.
 * Authenticated, scoped to the caller's account via resolveAccount + RLS.
 */
export async function POST(request: Request) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Phase 19: 30 mutations/min per user — stops scripted setting churn.
  if (!rateLimit(`settings:user:${user.id}`, 30, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const account = await resolveAccount(supabase, user.id, user.email ?? undefined);
  if (!account) {
    return NextResponse.json({ error: "Could not resolve your account" }, { status: 500 });
  }

  let body: {
    from_email?: string;
    reply_to?: string;
    support_email?: string;
    template?: { key?: string; subject?: string; body?: string };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Email settings update.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const value of [body.from_email, body.reply_to, body.support_email]) {
    if (value !== undefined && value !== "" && !EMAIL_RE.test(value)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }
  if (body.from_email !== undefined || body.reply_to !== undefined || body.support_email !== undefined) {
    const { error } = await supabase
      .from("accounts")
      .update({
        ...(body.from_email !== undefined ? { dunning_from_email: body.from_email || null } : {}),
        ...(body.reply_to !== undefined ? { dunning_reply_to: body.reply_to || null } : {}),
        ...(body.support_email !== undefined ? { dunning_support_email: body.support_email || null } : {}),
      })
      .eq("id", account.id);
    if (error) {
      return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
    }
    await logAudit(createServerClient(), {
      accountId: account.id,
      actor: "user",
      actorId: user.id,
      action: "settings.email",
      entityType: "account",
      entityId: account.id,
      meta: {
        fromEmail: body.from_email ?? null,
        replyTo: body.reply_to ?? null,
        supportEmail: body.support_email ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Template override update.
  const template = body.template;
  if (template?.key && isTemplateKey(template.key)) {
    const override: TemplateOverride = {};
    if (template.subject !== undefined) override.subject = template.subject;
    if (template.body !== undefined) override.body = template.body;
    const ok = await saveTemplateOverride(supabase, account.id, template.key, override);
    if (!ok) {
      return NextResponse.json({ error: "Could not save template" }, { status: 500 });
    }
    await logAudit(createServerClient(), {
      accountId: account.id,
      actor: "user",
      actorId: user.id,
      action: "settings.template",
      entityType: "template",
      entityId: template.key,
      meta: { override },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
