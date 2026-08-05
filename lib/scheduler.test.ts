import { describe, expect, it } from "vitest";
import {
  isDue,
  planAction,
  selectDuePayments,
  type FailedPaymentRow,
} from "./scheduler";

const HOUR = 3_600_000;

function payment(overrides: Partial<FailedPaymentRow> = {}): FailedPaymentRow {
  return {
    id: "fp_1",
    status: "open",
    decline_code: null,
    created_at: "2026-08-06T00:00:00.000Z",
    updated_at: "2026-08-06T00:00:00.000Z",
    last_scheduled_at: null,
    ...overrides,
  };
}

describe("planAction", () => {
  const base = new Date("2026-08-06T00:00:00.000Z");

  it("expired_card → immediate card-update email", () => {
    const plan = planAction(payment({ decline_code: "expired_card" }));
    expect(plan.action).toBe("email_card_update");
    expect(plan.dueAt.getTime()).toBe(base.getTime());
    expect(plan.chargeRetry).toBe(false);
  });

  it("insufficient_funds → due after 24h, retry safe", () => {
    const plan = planAction(payment({ decline_code: "insufficient_funds" }));
    expect(plan.action).toBe("email_retry");
    expect(plan.dueAt.getTime()).toBe(base.getTime() + 24 * HOUR);
    expect(plan.chargeRetry).toBe(true);
  });

  it("generic decline → due after 24h", () => {
    const plan = planAction(payment({ decline_code: "card_declined" }));
    expect(plan.action).toBe("email_generic");
    expect(plan.dueAt.getTime()).toBe(base.getTime() + 24 * HOUR);
  });

  it("fraudulent → immediate email, no auto-retry", () => {
    const plan = planAction(payment({ decline_code: "fraudulent" }));
    expect(plan.action).toBe("email_generic");
    expect(plan.dueAt.getTime()).toBe(base.getTime());
    expect(plan.chargeRetry).toBe(false);
  });
});

describe("isDue", () => {
  it("card update is due immediately", () => {
    const p = payment({ decline_code: "expired_card" });
    expect(isDue(p, new Date("2026-08-06T00:01:00.000Z"))).toBe(true);
  });

  it("insufficient funds is not due before 24h", () => {
    const p = payment({ decline_code: "insufficient_funds" });
    expect(isDue(p, new Date("2026-08-06T23:00:00.000Z"))).toBe(false);
    expect(isDue(p, new Date("2026-08-07T01:00:00.000Z"))).toBe(true);
  });
});

describe("selectDuePayments", () => {
  it("filters due + skips recently-scheduled (no double-fire)", () => {
    const now = new Date("2026-08-06T02:00:00.000Z");
    const payments = [
      payment({ id: "a", decline_code: "expired_card" }),
      payment({
        id: "b",
        decline_code: "insufficient_funds",
        last_scheduled_at: "2026-08-06T01:30:00.000Z", // 30 min ago → skip
      }),
      payment({
        id: "c",
        decline_code: "expired_card", // 0h delay → due now
        last_scheduled_at: "2026-08-06T00:00:00.000Z", // 2h ago → outside dedupe window
      }),
      payment({ id: "d", decline_code: "insufficient_funds" }), // not due yet
    ];
    const selected = selectDuePayments(payments, now);
    expect(selected.map((p) => p.id).sort()).toEqual(["a", "c"]);
  });
});
