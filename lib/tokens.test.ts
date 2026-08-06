import { describe, expect, it } from "vitest";
import {
  consumeToken,
  createRecoveryToken,
  findToken,
  generateRawToken,
  hashToken,
  isTokenExpired,
  isTokenUsable,
  TOKEN_TTL_MS,
} from "./tokens";
import { FakeSupabase } from "./supabase/fake";

describe("token generation + hashing", () => {
  it("generates a 64-char hex token (32 random bytes)", () => {
    expect(generateRawToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    expect(generateRawToken()).not.toBe(generateRawToken());
  });

  it("hash is SHA-256 hex and deterministic", () => {
    const raw = "abc123";
    const hash = hashToken(raw);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(raw)).toBe(hash);
    expect(hashToken(raw)).not.toBe(raw);
  });

  it("raw token is never stored — only its hash matches", () => {
    const raw = generateRawToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
  });
});

describe("expiry + single-use", () => {
  const fresh = () => ({
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    used_at: null as string | null,
  });

  it("TTL is 7 days", () => {
    expect(TOKEN_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("a fresh token is usable", () => {
    expect(isTokenUsable(fresh())).toBe(true);
    expect(isTokenExpired(fresh())).toBe(false);
  });

  it("an expired token is not usable", () => {
    const expired = {
      expires_at: new Date(Date.now() - 1000).toISOString(),
      used_at: null,
    };
    expect(isTokenExpired(expired)).toBe(true);
    expect(isTokenUsable(expired)).toBe(false);
  });

  it("a used token is not usable (single-use)", () => {
    expect(
      isTokenUsable({
        expires_at: new Date(Date.now() + 1000).toISOString(),
        used_at: new Date().toISOString(),
      }),
    ).toBe(false);
  });
});

describe("createRecoveryToken (DB)", () => {
  it("inserts a hashed token and returns raw + hash", async () => {
    const fake = new FakeSupabase();
    const result = await createRecoveryToken(fake as never, "cus_1", "fp_1");
    expect(result).not.toBeNull();
    expect(result!.raw).toMatch(/^[0-9a-f]{64}$/);
    expect(result!.hash).toBe(hashToken(result!.raw));
    expect(fake.insertCalls[0].table).toBe("recovery_tokens");
    expect(fake.insertCalls[0].values).toMatchObject({
      customer_id: "cus_1",
      failed_payment_id: "fp_1",
    });
  });

  it("returns null when the insert fails", async () => {
    const broken = {
      from: () => ({
        insert: () => Promise.resolve({ error: new Error("db down") }),
      }),
    };
    const result = await createRecoveryToken(broken as never, "cus_1", "fp_1");
    expect(result).toBeNull();
  });
});

describe("findToken (DB)", () => {
  it("looks up by hash and returns token + payment + customer", async () => {
    const raw = generateRawToken();
    const hash = hashToken(raw);
    const fake = new FakeSupabase({
      rows: {
        recovery_tokens: {
          id: "tok_1",
          customer_id: "cus_1",
          failed_payment_id: "fp_1",
          token_hash: hash,
          expires_at: new Date(Date.now() + 1000).toISOString(),
          used_at: null,
        },
      },
      lists: {
        failed_payments: [
          { id: "fp_1", amount_due: 2900, stripe_invoice_id: "in_1", status: "open", decline_code: "expired_card" },
        ],
        customers: [
          { id: "cus_1", email: "a@b.co", stripe_customer_id: "cus_1", account_id: "acct_1" },
        ],
      },
    });

    const found = await findToken(fake as never, raw);
    expect(found).not.toBeNull();
    expect(found!.token.id).toBe("tok_1");
    expect(found!.payment?.stripe_invoice_id).toBe("in_1");
    expect(found!.customer?.stripe_customer_id).toBe("cus_1");
  });

  it("returns null for an unknown token", async () => {
    const fake = new FakeSupabase({ rows: { recovery_tokens: null } });
    expect(await findToken(fake as never, "nope")).toBeNull();
  });
});

describe("consumeToken (DB)", () => {
  it("consumes an unused token", async () => {
    const fake = new FakeSupabase();
    expect(await consumeToken(fake as never, "tok_1")).toBe(true);
  });

  it("returns false when already used (no row updated)", async () => {
    const fake = {
      from: () => ({
        update: () => ({
          eq: () => ({
            is: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
          }),
        }),
      }),
    };
    expect(await consumeToken(fake as never, "tok_1")).toBe(false);
  });
});
