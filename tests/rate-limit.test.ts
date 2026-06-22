import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  rateLimitOr429,
  _resetRateLimiterForTests,
} from "@/lib/auth/rate-limit";
import type { NextRequest } from "next/server";

function makeRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
) {
  const h = new Map(Object.entries(headers));
  return {
    headers: {
      get: (name: string) => h.get(name.toLowerCase()) ?? null,
    },
    cookies: {
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
    },
  } as unknown as NextRequest;
}

describe("rate-limit — checkRateLimit (pure sliding window)", () => {
  beforeEach(() => _resetRateLimiterForTests());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("ip-1", 5, 60_000);
      expect(r.allowed).toBe(true);
    }
    const r = checkRateLimit("ip-1", 5, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it("reports remaining count correctly", () => {
    checkRateLimit("ip-2", 10, 60_000);
    checkRateLimit("ip-2", 10, 60_000);
    const r = checkRateLimit("ip-2", 10, 60_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(7);
  });

  it("isolates keys — different keys have separate counters", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("a", 3, 60_000);
    expect(checkRateLimit("a", 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit("b", 3, 60_000).allowed).toBe(true);
  });

  it("returns retryAfter >= 0 when denied", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("ip-3", 5, 60_000);
    const r = checkRateLimit("ip-3", 5, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfter).toBeGreaterThanOrEqual(0);
    expect(r.retryAfter).toBeLessThanOrEqual(60);
  });

  it("evicts expired timestamps outside the window", () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    // Fill the bucket
    for (let i = 0; i < 5; i++) checkRateLimit("ip-4", 5, 10_000);
    expect(checkRateLimit("ip-4", 5, 10_000).allowed).toBe(false);
    // Advance past the window — old timestamps should be evicted
    vi.setSystemTime(now + 11_000);
    const r = checkRateLimit("ip-4", 5, 10_000);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(4);
    vi.useRealTimers();
  });
});

describe("rate-limit — getClientIp", () => {
  it("reads the first IP from x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeRequest({ "x-real-ip": "9.10.11.12" });
    expect(getClientIp(req)).toBe("9.10.11.12");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace around x-forwarded-for first entry", () => {
    const req = makeRequest({ "x-forwarded-for": "  203.0.113.5  , 70.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });
});

describe("rate-limit — rateLimitOr429 (route helper)", () => {
  beforeEach(() => {
    _resetRateLimiterForTests();
    // Re-enable rate limiting for these tests (globally disabled in setup.ts).
    vi.stubEnv("RATE_LIMIT_DISABLED", "");
  });

  it("returns null when under the limit (request allowed)", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1" });
    const result = rateLimitOr429(req, { limit: 5, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("returns a 429 response when the limit is exceeded", async () => {
    const req = makeRequest({ "x-forwarded-for": "2.2.2.2" });
    for (let i = 0; i < 5; i++) {
      expect(rateLimitOr429(req, { limit: 5, windowMs: 60_000 })).toBeNull();
    }
    const blocked = rateLimitOr429(req, { limit: 5, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    const body = await blocked!.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("includes a Retry-After header on the 429 response", () => {
    const req = makeRequest({ "x-forwarded-for": "3.3.3.3" });
    for (let i = 0; i < 3; i++) rateLimitOr429(req, { limit: 3, windowMs: 60_000 });
    const blocked = rateLimitOr429(req, { limit: 3, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    const retryAfter = blocked!.headers.get("Retry-After");
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it("uses keyPrefix to namespace the rate-limit key", () => {
    const req = makeRequest({ "x-forwarded-for": "4.4.4.4" });
    // Fill the "upload" bucket
    for (let i = 0; i < 3; i++) {
      expect(rateLimitOr429(req, { limit: 3, windowMs: 60_000, keyPrefix: "upload" })).toBeNull();
    }
    // "upload" is full
    expect(rateLimitOr429(req, { limit: 3, windowMs: 60_000, keyPrefix: "upload" })?.status).toBe(429);
    // "approve" bucket is independent
    expect(rateLimitOr429(req, { limit: 3, windowMs: 60_000, keyPrefix: "approve" })).toBeNull();
  });

  it("disables rate limiting when RATE_LIMIT_DISABLED=1", () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    const req = makeRequest({ "x-forwarded-for": "5.5.5.5" });
    // Even after 100 calls, never blocked
    for (let i = 0; i < 100; i++) {
      expect(rateLimitOr429(req, { limit: 2, windowMs: 60_000 })).toBeNull();
    }
    vi.unstubAllEnvs();
  });

  it("treats 'unknown' IP as a shared key (still rate-limited)", () => {
    const req = makeRequest({});
    for (let i = 0; i < 2; i++) {
      expect(rateLimitOr429(req, { limit: 2, windowMs: 60_000 })).toBeNull();
    }
    expect(rateLimitOr429(req, { limit: 2, windowMs: 60_000 })?.status).toBe(429);
  });
});
