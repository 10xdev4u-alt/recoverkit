import { describe, expect, it } from "vitest";
import { isTemplateKey } from "./template-store";
import { pickSubject } from "./subjects";

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
