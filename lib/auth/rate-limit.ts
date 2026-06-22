import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * In-memory sliding-window rate limiter (Wave 6 Task 3 — Hardening).
 *
 * Protects upload / transcribe / package / approve routes from abuse by
 * limiting requests per client IP within a time window. The store is a simple
 * Map<string, number[]> — each value is a list of request timestamps inside the
 * active window. Expired timestamps are evicted on every check.
 *
 * Env-gated: set `RATE_LIMIT_DISABLED=1` to disable rate limiting entirely
 * (useful in tests and local dev). When disabled, `rateLimitOr429` always
 * returns null (request allowed).
 *
 * NOTE: This is an in-memory limiter — it resets on every serverless cold
 * start and is NOT shared across instances. For a production multi-instance
 * deploy, swap this for a Redis-backed limiter. For a single-instance pilot
 * (Vercel hobby or a single container), this is sufficient.
 */

/** Result of a rate-limit check. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the oldest request in the window expires (for Retry-After). */
  retryAfter: number;
}

/** Options for the route-helper `rateLimitOr429`. */
export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Namespace prefix for the key (e.g. "upload", "approve"). Defaults to "default". */
  keyPrefix?: string;
}

// ---- In-memory store ----

const store = new Map<string, number[]>();

/** Evict timestamps older than the window boundary. Mutates the array in place. */
function evictExpired(timestamps: number[], windowStart: number): number[] {
  // Filter in place: keep only timestamps >= windowStart
  let writeIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] >= windowStart) {
      timestamps[writeIdx++] = timestamps[i];
    }
  }
  timestamps.length = writeIdx;
  return timestamps;
}

/**
 * Check whether a request identified by `key` is allowed under the rate limit.
 * Pure function — does not touch Next.js objects. Records the timestamp if
 * allowed.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = store.get(key) ?? [];
  evictExpired(timestamps, windowStart);

  if (timestamps.length >= limit) {
    // Denied — compute retryAfter from the oldest surviving timestamp
    const oldest = timestamps[0] ?? now;
    const retryAfterMs = oldest + windowMs - now;
    const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfter: retryAfterSec,
    };
  }

  // Allowed — record this request
  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    retryAfter: 0,
  };
}

/**
 * Extract the client IP from request headers.
 * Checks `x-forwarded-for` (first entry) then `x-real-ip`, falling back to
 * "unknown" when neither is present (e.g. direct localhost or test requests).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers?.get?.("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers?.get?.("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Route helper: check the rate limit for the incoming request and return a 429
 * NextResponse if the limit is exceeded, or null if the request is allowed.
 *
 * Usage in a route handler:
 * ```ts
 * const blocked = rateLimitOr429(request, { limit: 10, windowMs: 600_000, keyPrefix: "upload" });
 * if (blocked) return blocked;
 * ```
 *
 * When `RATE_LIMIT_DISABLED=1` is set in the environment, this always returns
 * null (rate limiting disabled).
 */
export function rateLimitOr429(
  request: NextRequest,
  options: RateLimitOptions,
): NextResponse | null {
  // Env gate — allow disabling in tests / dev
  if (process.env.RATE_LIMIT_DISABLED === "1") {
    return null;
  }

  const ip = getClientIp(request);
  const prefix = options.keyPrefix ?? "default";
  const key = `${prefix}:${ip}`;

  const result = checkRateLimit(key, options.limit, options.windowMs);

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/** Clear the in-memory store — for tests only. */
export function _resetRateLimiterForTests(): void {
  store.clear();
}
