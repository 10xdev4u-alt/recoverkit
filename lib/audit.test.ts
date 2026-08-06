import { describe, expect, it, vi } from "vitest";
import { logAudit } from "./audit";

/** Minimal mock that records the insert payload like the real client. */
function mockSupabase() {
  const inserts: Array<Record<string, unknown>> = [];
  const supabase = {
    inserts,
    from: vi.fn((table: string) => ({
      insert: vi.fn((values: Record<string, unknown>) => {
        if (table === "audit_events") inserts.push(values);
        return {
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve().then(() => resolve({ error: null })),
        };
      }),
    })),
  };
  return supabase;
}

describe("logAudit", () => {
  it("inserts an audit row with the entry fields", async () => {
    const supabase = mockSupabase();
    await logAudit(supabase as never, {
      accountId: "acct-1",
      actor: "user",
      actorId: "user-9",
      action: "settings.template",
      entityType: "template",
      entityId: "expired-card",
      meta: { subject: "Update your card" },
    });

    expect(supabase.inserts[0]).toMatchObject({
      account_id: "acct-1",
      actor_type: "user",
      actor_id: "user-9",
      action: "settings.template",
      entity_type: "template",
      entity_id: "expired-card",
      meta: { subject: "Update your card" },
    });
  });

  it("defaults actor to system and entity fields to null", async () => {
    const supabase = mockSupabase();
    await logAudit(supabase as never, {
      accountId: "acct-2",
      action: "stripe.connect",
    });

    expect(supabase.inserts[0]).toMatchObject({
      account_id: "acct-2",
      actor_type: "system",
      actor_id: null,
      entity_type: null,
      entity_id: null,
      meta: {},
    });
  });

  it("never throws when the write fails", async () => {
    const supabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve().then(() => resolve({ error: new Error("boom") })),
        })),
      })),
    };
    await expect(
      logAudit(supabase as never, { accountId: "x", action: "test" }),
    ).resolves.toBeUndefined();
  });
});
