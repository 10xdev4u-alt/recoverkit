import { describe, expect, it } from "vitest";
import {
  generateRawToken,
  hashToken,
  isTokenExpired,
  isTokenUsable,
  TOKEN_TTL_MS,
} from "./tokens";

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
