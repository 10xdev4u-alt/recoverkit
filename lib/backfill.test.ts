import { describe, expect, it } from "vitest";
import { mapPaymentFailed } from "./recovery";

describe("backfill mapping (Phase 17)", () => {
  it("maps an open invoice with attempts to an open failed payment", () => {
    const invoice = {
      id: "in_1",
      subscription: "sub_1",
      customer: "cus_1",
      amount_due: 2900,
      attempt_count: 3,
      next_payment_attempt: 1750000000,
      payment_intent: { last_payment_error: { decline_code: "card_declined" } },
    };
    const record = mapPaymentFailed(invoice as never, 1749000000, "c_1");
    expect(record.status).toBe("open");
    expect(record.stripeInvoiceId).toBe("in_1");
    expect(record.attemptCount).toBe(3);
    expect(record.declineCode).toBe("card_declined");
    expect(record.amountDue).toBe(2900);
    expect(record.nextPaymentAttempt).toBe(
      new Date(1750000000 * 1000).toISOString(),
    );
  });

  it("extracts decline code from a string payment_intent id (null when absent)", () => {
    const record = mapPaymentFailed(
      { id: "in_2", attempt_count: 1, payment_intent: "pi_1" } as never,
      100,
      "c_1",
    );
    // String id → no decline info (backfill enriches it via API).
    expect(record.declineCode).toBeNull();
  });

  it("defaults attempt_count to 1 when missing", () => {
    const record = mapPaymentFailed({ id: "in_3" } as never, 100, "c_1");
    expect(record.attemptCount).toBe(1);
    expect(record.amountDue).toBe(0);
  });
});
