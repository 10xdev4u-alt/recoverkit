import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Phase 19: audit log helper. Appends an immutable row to `audit_events`
 * describing a sensitive mutation. Best-effort — a failed write must never
 * break the primary operation it is describing.
 */

export type AuditActor = "user" | "system" | "stripe" | "resend";

export interface AuditEntry {
  accountId: string;
  actor?: AuditActor;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

/** Best-effort audit append. Never throws. */
export async function logAudit(
  supabase: SupabaseClient | null | undefined,
  entry: AuditEntry,
): Promise<void> {
  try {
    if (!supabase) return;
    const { error } = await supabase.from("audit_events").insert({
      account_id: entry.accountId,
      actor_type: entry.actor ?? "system",
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      meta: entry.meta ?? {},
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`audit: failed to record "${entry.action}"`, error.message);
    }
  } catch {
    // Never let audit logging take down the primary operation.
  }
}
