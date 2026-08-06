import { describe, expect, it } from "vitest";
import {
  getTemplateOverrides,
  isTemplateKey,
  saveTemplateOverride,
  setTemplateOverrides,
} from "./template-store";
import { pickSubject } from "./subjects";
import { FakeSupabase } from "./supabase/fake";

describe("isTemplateKey", () => {
  it("accepts the three editable templates", () => {
    for (const key of ["expired_card", "insufficient_funds", "generic"]) {
      expect(isTemplateKey(key)).toBe(true);
    }
  });

  it("rejects everything else", () => {
    expect(isTemplateKey("recovery")).toBe(false);
    expect(isTemplateKey("")).toBe(false);
    expect(isTemplateKey("INJECT' OR 1=1")).toBe(false);
  });
});

describe("pickSubject with overrides (Phase 16)", () => {
  it("uses the override when provided", () => {
    expect(pickSubject("expired_card", "Acme", "We need your card"))
      .toBe("We need your card");
  });

  it("falls back to the approved default when override is empty/whitespace", () => {
    expect(pickSubject("expired_card", "Acme", "")).toBe(
      "Your card on file expired — quick fix for Acme",
    );
    expect(pickSubject("expired_card", "Acme", "   ")).toBe(
      "Your card on file expired — quick fix for Acme",
    );
    expect(pickSubject("expired_card", "Acme", undefined)).toBe(
      "Your card on file expired — quick fix for Acme",
    );
  });
});

describe("template overrides (DB)", () => {
  it("returns {} when no overrides are set", async () => {
    const fake = new FakeSupabase({ rows: { accounts: { template_overrides: null } } });
    expect(await getTemplateOverrides(fake as never, "acct_1")).toEqual({});
  });

  it("returns stored overrides", async () => {
    const fake = new FakeSupabase({
      rows: {
        accounts: {
          template_overrides: { expired_card: { subject: "Custom" } },
        },
      },
    });
    const out = await getTemplateOverrides(fake as never, "acct_1");
    expect(out.expired_card?.subject).toBe("Custom");
  });

  it("setTemplateOverrides writes the map", async () => {
    const fake = new FakeSupabase();
    const ok = await setTemplateOverrides(fake as never, "acct_1", {
      generic: { body: "Hey" },
    });
    expect(ok).toBe(true);
    expect(fake.updateCalls[0].table).toBe("accounts");
    expect(fake.updateCalls[0].values.template_overrides).toEqual({
      generic: { body: "Hey" },
    });
  });

  it("saveTemplateOverride merges into existing overrides", async () => {
    const fake = new FakeSupabase({
      rows: {
        accounts: {
          template_overrides: { expired_card: { subject: "Keep me" } },
        },
      },
    });
    await saveTemplateOverride(fake as never, "acct_1", "generic", {
      subject: "New",
    });
    const saved = fake.updateCalls[0].values.template_overrides as Record<
      string,
      unknown
    >;
    expect(saved.expired_card).toEqual({ subject: "Keep me" });
    expect(saved.generic).toEqual({ subject: "New" });
  });
});
