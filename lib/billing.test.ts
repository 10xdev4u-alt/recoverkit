import { describe, expect, it, vi } from "vitest";
import {
  hasActivePlan,
  mapStripeStatus,
  syncSubscription,
  clearSubscription,
} from "./billing";

/** Minimal mock recording update payloads on the accounts table. */
function mockSupabase() {
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    updates,
    from: vi.fn((table: string) => ({
      update: vi.fn((values: Record<string, unknown>) => {
        if (table === "accounts") updates.push(values);
        return {
          eq: vi.fn(() => ({
            then: (resolve: (v: unknown) => unknown) =>
              Promise.resolve().then(() => resolve({ error: null })),
          })),
        };
      }),
    })),
  };
  return supabase;
}

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_123",
    items: {
      data: [{ price: { id: "price_2900" }, current_period_end: 1800000000 }],
    },
    ...overrides,
  };
}

describe("mapStripeStatus", () => {
  it("maps every stripe status onto our plan_status", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("unpaid")).toBe("unpaid");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("paused")).toBe("paused");
  });

  it("treats incomplete subscriptions as free (not entitled)", () => {
    expect(mapStripeStatus("incomplete")).toBe("free");
    expect(mapStripeStatus("incomplete_expired")).toBe("free");
  });
});

describe("hasActivePlan", () => {
  it("entitles active and trialing", () => {
    expect(hasActivePlan("active")).toBe(true);
    expect(hasActivePlan("trialing")).toBe(true);
  });

  it("does not entitle free, past_due, unpaid, canceled, paused", () => {
    expect(hasActivePlan("free")).toBe(false);
    expect(hasActivePlan("past_due")).toBe(false);
    expect(hasActivePlan("unpaid")).toBe(false);
    expect(hasActivePlan("canceled")).toBe(false);
    expect(hasActivePlan("paused")).toBe(false);
  });

  it("handles null/undefined (unconfigured account)", () => {
    expect(hasActivePlan(null)).toBe(false);
    expect(hasActivePlan(undefined)).toBe(false);
  });
});

describe("syncSubscription", () => {
  it("maps subscription fields onto the account row", async () => {
    const supabase = mockSupabase();
    await syncSubscription(
      supabase as never,
      "acct-1",
      subscription() as never,
    );

    expect(supabase.updates[0]).toMatchObject({
      plan_status: "active",
      stripe_subscription_id: "sub_1",
      stripe_customer_id: "cus_123",
      plan_price_id: "price_2900",
      current_period_end: new Date(1800000000 * 1000).toISOString(),
    });
  });

  it("maps past_due and resolves expanded customer objects", async () => {
    const supabase = mockSupabase();
    await syncSubscription(
      supabase as never,
      "acct-2",
      subscription({
        status: "past_due",
        customer: { id: "cus_expanded" },
      }) as never,
    );

    expect(supabase.updates[0]).toMatchObject({
      plan_status: "past_due",
      stripe_customer_id: "cus_expanded",
    });
  });
});

describe("clearSubscription", () => {
  it("resets the account to free", async () => {
    const supabase = mockSupabase();
    await clearSubscription(supabase as never, "acct-1");

    expect(supabase.updates[0]).toMatchObject({
      plan_status: "free",
      stripe_subscription_id: null,
      plan_price_id: null,
      current_period_end: null,
    });
  });
});
