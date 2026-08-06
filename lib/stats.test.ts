import { describe, expect, it } from "vitest";
import {
  computeStats,
  fetchAccountPayments,
  fetchOpenPayments,
  fetchRecentPayments,
  recoveryRate,
  sumCents,
  type PaymentRow,
} from "./stats";
import { FakeSupabase } from "./supabase/fake";

function payment(overrides: Partial<PaymentRow>): PaymentRow {
  return {
    id: "fp_1",
    amount_due: 2900,
    status: "open",
    decline_code: null,
    created_at: "2026-08-06T00:00:00.000Z",
    ...overrides,
  };
}

describe("sumCents", () => {
  it("sums amount_due", () => {
    expect(sumCents([{ amount_due: 2900 }, { amount_due: 1100 }])).toBe(4000);
    expect(sumCents([])).toBe(0);
  });
});

describe("recoveryRate", () => {
  it("null when nothing resolved", () => {
    expect(recoveryRate(0, 0)).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(recoveryRate(3, 1)).toBe(33.3);
    expect(recoveryRate(2, 2)).toBe(100);
  });
});

describe("computeStats", () => {
  const NOW = "2026-08-10T12:00:00.000Z";

  it("computes open/at-risk and recovered totals", () => {
    const payments = [
      payment({
        id: "a",
        amount_due: 2900,
        status: "open",
        created_at: NOW,
      }),
      payment({
        id: "b",
        amount_due: 5000,
        status: "paid",
        created_at: "2026-08-01T00:00:00.000Z",
      }),
      payment({
        id: "c",
        amount_due: 1200,
        status: "void",
        created_at: "2026-08-02T00:00:00.000Z",
      }),
    ];
    const stats = computeStats(payments);
    expect(stats.openCount).toBe(1);
    expect(stats.atRiskCents).toBe(2900);
    expect(stats.recoveredCentsThisMonth).toBe(5000);
    expect(stats.resolvedCount).toBe(2);
    expect(stats.recoveryRatePct).toBe(50);
  });

  it("sorts newest first", () => {
    const stats = computeStats([
      payment({ id: "old", created_at: "2026-08-01T00:00:00.000Z" }),
      payment({ id: "new", created_at: "2026-08-09T00:00:00.000Z" }),
    ]);
    expect(stats.payments[0].id).toBe("new");
  });

  it("recovered this month only counts payments from the current month", () => {
    const payments = [
      payment({ id: "last-month", status: "paid", created_at: "2026-07-20T00:00:00.000Z" }),
      payment({ id: "this-month", status: "paid", created_at: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(computeStats(payments).recoveredCentsThisMonth).toBe(2900);
  });
});

describe("DB fetchers (fake client)", () => {
  const rows = [
    { id: "a", amount_due: 1000, status: "open", decline_code: null, created_at: "2026-08-01T00:00:00.000Z", customers: [{ account_id: "acct_1" }] },
    { id: "b", amount_due: 2000, status: "paid", decline_code: null, created_at: "2026-08-02T00:00:00.000Z", customers: [{ account_id: "acct_1" }] },
  ];

  it("fetchAccountPayments maps + filters by account", async () => {
    const fake = new FakeSupabase({ lists: { failed_payments: rows } });
    const out = await fetchAccountPayments(fake as never, "acct_1", 50);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "a", amount_due: 1000, status: "open" });
    expect(out[0]).not.toHaveProperty("customers");
  });

  it("fetchOpenPayments returns only open", async () => {
    const fake = new FakeSupabase({ lists: { failed_payments: rows } });
    const out = await fetchOpenPayments(fake as never, "acct_1");
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("a");
  });

  it("fetchRecentPayments sorts newest first", async () => {
    const fake = new FakeSupabase({ lists: { failed_payments: rows } });
    const out = await fetchRecentPayments(fake as never, "acct_1", 50);
    expect(out[0].id).toBe("b");
  });

  it("returns [] on error", async () => {
    const broken = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ limit: () => Promise.resolve({ data: null, error: new Error("x") }) }),
          }),
        }),
      }),
    };
    expect(await fetchAccountPayments(broken as never, "acct_1", 50)).toEqual([]);
  });
});
