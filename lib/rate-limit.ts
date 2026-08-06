/**
 * Minimal in-memory sliding-window rate limiter for public endpoints
 * (magic-link card update, waitlist, etc.). One instance per serverless
 * lambda, so it throttles bursts per isolate — good enough to stop carding
 * scripts; not a global quota. Phase 19 upgrades this if needed.
 */

const buckets = new Map<string, number[]>();

/** Returns true when the request is allowed (under limit), false to reject. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

/** Best-effort client IP from a request (Vercel passes x-forwarded-for). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
