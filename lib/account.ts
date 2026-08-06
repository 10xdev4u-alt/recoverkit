import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Account resolution for the authenticated dashboard (Phase 14).
 *
 * A Supabase Auth user maps to exactly one `accounts` row via
 * `accounts.user_id`. On first sign-in we bind the user to the existing
 * single unbound account (the default "RecoverKit" account the connect flow
 * creates) or create a fresh one.
 */
export async function resolveAccount(
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
): Promise<{ id: string; name: string | null } | null> {
  // Already bound?
  const { data: bound } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", userId)
    .maybeSingle();
  if (bound) return bound;

  // Claim a single unbound account (pre-auth connect-flow default).
  const { data: unbound } = await supabase
    .from("accounts")
    .select("id, name")
    .is("user_id", null)
    .limit(2);
  if (unbound && unbound.length === 1) {
    const { data: claimed, error } = await supabase
      .from("accounts")
      .update({ user_id: userId, name: unbound[0].name ?? email?.split("@")[0] ?? "My store" })
      .eq("id", unbound[0].id)
      .select("id, name")
      .single();
    if (!error && claimed) return claimed;
  }

  // Create a fresh account bound to this user.
  const { data: created, error } = await supabase
    .from("accounts")
    .insert({
      user_id: userId,
      name: email?.split("@")[0] ?? "My store",
    })
    .select("id, name")
    .single();
  if (error) return null;
  return created;
}
