import { NextResponse } from "next/server";
import { createUserClient } from "@/lib/supabase/ssr";
import { resolveAccount } from "@/lib/account";
import {
  isTemplateKey,
  saveTemplateOverride,
  type TemplateOverride,
} from "@/lib/template-store";

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
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
}
