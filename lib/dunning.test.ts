import { describe, expect, it } from "vitest";
import {
  buildUpdateUrl,
  formatAmount,
  formatDate,
  isNudgeDue,
  NUDGE_WINDOW_MS,
} from "./dunning-helpers";
import { pickSubject } from "./subjects";

describe("formatAmount", () => {
  it("formats cents as dollars", () => {
    expect(formatAmount(2900)).toBe("$29.00");
    expect(formatAmount(0)).toBe("$0.00");
    expect(formatAmount(123456)).toBe("$1,234.56");
  });
});

describe("formatDate", () => {
  it("formats a date as readable", () => {
    expect(formatDate(new Date("2026-08-06T00:00:00Z"))).toBe("Aug 6, 2026");
  });
});

describe("buildUpdateUrl", () => {
  it("joins app URL with the recovery route, stripping trailing slash", () => {
    expect(buildUpdateUrl("https://acme.com/", "tok123")).toBe(
      "https://acme.com/recover/tok123",
    );
    expect(buildUpdateUrl("https://acme.com", "tok123")).toBe(
      "https://acme.com/recover/tok123",
    );
  });
});

describe("subjects (EMAIL_TEMPLATES.md)", () => {
  it("expired_card subject", () => {
    expect(pickSubject("expired_card", "Acme")).toBe(
      "Your card on file expired — quick fix for Acme",
    );
  });
  it("insufficient_funds subject", () => {
    expect(pickSubject("insufficient_funds", "Acme")).toBe(
      "Your payment didn't go through — Acme",
    );
  });
  it("generic subject", () => {
    expect(pickSubject("generic", "Acme")).toBe(
      "We couldn't process your payment — Acme",
    );
  });
});

describe("isNudgeDue", () => {
  const HOUR = 3_600_000;
  const now = new Date("2026-08-08T12:00:00.000Z");

  it("false when no email was sent", () => {
    expect(isNudgeDue({ lastSentAt: null, hasClicked: false }, now)).toBe(false);
  });

  it("false when the link was clicked", () => {
    expect(
      isNudgeDue(
        { lastSentAt: new Date(now.getTime() - 72 * HOUR).toISOString(), hasClicked: true },
        now,
      ),
    ).toBe(false);
  });

  it("false within the 48h window", () => {
    expect(
      isNudgeDue(
        { lastSentAt: new Date(now.getTime() - 24 * HOUR).toISOString(), hasClicked: false },
        now,
      ),
    ).toBe(false);
  });

  it("true 48h after an unclicked send", () => {
    expect(NUDGE_WINDOW_MS).toBe(48 * HOUR);
    expect(
      isNudgeDue(
        { lastSentAt: new Date(now.getTime() - 48 * HOUR - 1000).toISOString(), hasClicked: false },
        now,
      ),
    ).toBe(true);
  });
});
