import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailTemplateKey } from "@/lib/decline-codes";

/**
 * Template customization store (Phase 16). Merchants own their email voice:
 * per-account overrides for subject + body copy, stored on accounts
 * (template_overrides jsonb). Null means "use the approved default copy".
 */

export interface TemplateOverride {
  subject?: string;
  body?: string;
}

export type TemplateOverrides = Partial<Record<EmailTemplateKey, TemplateOverride>>;

const VALID_KEYS: EmailTemplateKey[] = [
  "expired_card",
  "insufficient_funds",
  "generic",
];

export function isTemplateKey(key: string): key is EmailTemplateKey {
  return (VALID_KEYS as string[]).includes(key);
}

/** Load the account's overrides (empty object when none set). */
export async function getTemplateOverrides(
  supabase: SupabaseClient,
  accountId: string,
): Promise<TemplateOverrides> {
  const { data } = await supabase
    .from("accounts")
    .select("template_overrides")
    .eq("id", accountId)
    .maybeSingle();

  const raw = (data as { template_overrides: unknown } | null)?.template_overrides;
  if (!raw || typeof raw !== "object") return {};
  return raw as TemplateOverrides;
}

/** Save the full override map for an account. */
export async function setTemplateOverrides(
  supabase: SupabaseClient,
  accountId: string,
  overrides: TemplateOverrides,
): Promise<boolean> {
  const { error } = await supabase
    .from("accounts")
    .update({ template_overrides: overrides })
    .eq("id", accountId);
  return !error;
}

/** Merge per-key overrides in (only touching provided keys). */
export async function saveTemplateOverride(
  supabase: SupabaseClient,
  accountId: string,
  key: EmailTemplateKey,
  override: TemplateOverride,
): Promise<boolean> {
  const current = await getTemplateOverrides(supabase, accountId);
  current[key] = override;
  return setTemplateOverrides(supabase, accountId, current);
}
