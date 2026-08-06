import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const now = 1_000_000;
    expect(rateLimit("k-allow", 3, 60_000, now)).toBe(true);
    expect(rateLimit("k-allow", 3, 60_000, now + 1000)).toBe(true);
    expect(rateLimit("k-allow", 3, 60_000, now + 2000)).toBe(true);
  });

  it("rejects once the window is exhausted", () => {
    const now = 1_000_000;
    rateLimit("k-reject", 2, 60_000, now);
    rateLimit("k-reject", 2, 60_000, now + 1000);
    expect(rateLimit("k-reject", 2, 60_000, now + 2000)).toBe(false);
  });

  it("sliding window recovers after it elapses", () => {
    const now = 1_000_000;
    rateLimit("k-slide", 1, 60_000, now);
    expect(rateLimit("k-slide", 1, 60_000, now + 5000)).toBe(false);
    expect(rateLimit("k-slide", 1, 60_000, now + 61_000)).toBe(true);
  });

  it("keys are independent", () => {
    rateLimit("a", 1, 60_000, 1_000_000);
    expect(rateLimit("b", 1, 60_000, 1_000_001)).toBe(true);
  });
});
