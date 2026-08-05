import { describe, expect, it } from "vitest";
import {
  classifyDecline,
  getRetryPolicy,
  type DeclineFamily,
} from "./decline-codes";

describe("classifyDecline", () => {
  const cases: Array<[string | null | undefined, DeclineFamily]> = [
    ["expired_card", "card_update"],
    ["incorrect_cvc", "card_update"],
    ["incorrect_number", "card_update"],
    ["stolen_card", "card_update"],
    ["lost_card", "card_update"],
    ["restricted_card", "generic"],
    ["approval_not_allowed", "generic"],
    ["insufficient_funds", "insufficient_funds"],
    ["processing_error", "processing_error"],
    ["fraudulent", "fraudulent"],
    ["card_declined", "generic"],
    ["do_not_honor", "generic"],
    ["generic_decline", "generic"],
    [null, "generic"],
    [undefined, "generic"],
    ["some_unknown_code", "generic"],
  ];

  it.each(cases)("classifies %s → %s", (code, expected) => {
    expect(classifyDecline(code)).toBe(expected);
  });
});

describe("getRetryPolicy (EMAIL_TEMPLATES routing table)", () => {
  it("card update codes email immediately, no charge retry", () => {
    const policy = getRetryPolicy("expired_card");
    expect(policy.emailTemplate).toBe("expired_card");
    expect(policy.emailDelayHours).toBe(0);
    expect(policy.chargeRetry).toBe(false);
  });

  it("insufficient funds uses the 24-48h window", () => {
    const policy = getRetryPolicy("insufficient_funds");
    expect(policy.emailTemplate).toBe("insufficient_funds");
    expect(policy.emailDelayHours).toBe(24);
    expect(policy.chargeRetry).toBe(true);
  });

  it("processing error is a safe short retry", () => {
    const policy = getRetryPolicy("processing_error");
    expect(policy.emailTemplate).toBe("generic");
    expect(policy.emailDelayHours).toBe(24);
    expect(policy.chargeRetry).toBe(true);
  });

  it("fraudulent emails now but never auto-retries", () => {
    const policy = getRetryPolicy("fraudulent");
    expect(policy.emailTemplate).toBe("generic");
    expect(policy.emailDelayHours).toBe(0);
    expect(policy.chargeRetry).toBe(false);
  });

  it("generic + unknown codes use the ~24h generic template", () => {
    for (const code of ["card_declined", "do_not_honor", null]) {
      const policy = getRetryPolicy(code);
      expect(policy.emailTemplate).toBe("generic");
      expect(policy.emailDelayHours).toBe(24);
      expect(policy.chargeRetry).toBe(true);
    }
  });
});
