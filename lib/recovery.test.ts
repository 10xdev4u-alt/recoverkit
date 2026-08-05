import { describe, expect, it } from "vitest";
import {
  mapChargeFailed,
  mapPaymentFailed,
  mapPaymentSucceeded,
} from "./recovery";

describe("mapPaymentFailed", () => {
  it("extracts decline code from an expanded payment_intent", () => {
    const record = mapPaymentFailed(
      {
        id: "in_123",
        subscription: "sub_9",
        customer: "cus_7",
        amount_due: 2900,
        attempt_count: 3,
        next_payment_attempt: 1786000000,
        payment_intent: {
          id: "pi_1",
          last_payment_error: { decline_code: "expired_card", code: "card_declined" },
        },
      },
      1785900000,
      "row_1",
    );
    expect(record).toMatchObject({
      stripeInvoiceId: "in_123",
      stripeSubscriptionId: "sub_9",
      amountDue: 2900,
      attemptCount: 3,
      declineCode: "expired_card",
      status: "open",
      setNextAttempt: true,
      eventCreated: 1785900000,
    });
    // epoch seconds → ISO
    expect(record.nextPaymentAttempt).toBe(
      new Date(1786000000 * 1000).toISOString(),
    );
  });

  it("falls back to error code and handles plain-string payment_intent", () => {
    const record = mapPaymentFailed(
      {
        id: "in_2",
        customer: "cus_7",
        amount_due: 900,
        attempt_count: 1,
        payment_intent: "pi_2",
      },
      1785900001,
      "row_2",
    );
    expect(record.declineCode).toBeNull();
    expect(record.nextPaymentAttempt).toBeNull();
  });

  it("null next_payment_attempt means final attempt", () => {
    const record = mapPaymentFailed(
      { id: "in_3", customer: "cus_7", amount_due: 900, next_payment_attempt: null },
      1785900002,
      "row_3",
    );
    expect(record.nextPaymentAttempt).toBeNull();
  });
});

describe("mapPaymentSucceeded", () => {
  it("marks the record paid", () => {
    const record = mapPaymentSucceeded(
      { id: "in_123", customer: "cus_7", amount_paid: 2900, attempt_count: 4 },
      1785900010,
      "row_1",
    );
    expect(record.status).toBe("paid");
    expect(record.amountDue).toBe(2900);
    expect(record.declineCode).toBeNull();
  });
});

describe("mapChargeFailed", () => {
  it("uses the invoice id when the charge belongs to one", () => {
    const record = mapChargeFailed(
      {
        id: "ch_1",
        invoice: "in_123",
        customer: "cus_7",
        amount: 2900,
        failure_code: "card_declined",
      },
      1785900020,
      "row_1",
    );
    expect(record.stripeInvoiceId).toBe("in_123");
    expect(record.declineCode).toBe("card_declined");
    expect(record.setNextAttempt).toBe(false);
  });

  it("keys one-off charges by charge id and never clobbers the retry schedule", () => {
    const record = mapChargeFailed(
      { id: "ch_9", customer: "cus_7", amount: 900 },
      1785900021,
      "row_9",
    );
    expect(record.stripeInvoiceId).toBe("charge:ch_9");
    expect(record.declineCode).toBeNull();
    expect(record.setNextAttempt).toBe(false);
  });
});
