import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Phase 2 — stateless signed session tokens (HMAC-SHA256).
 *
 * The token is `base64url(JSON.stringify(payload)).base64url(hmac)`. Stateless
 * so it works without a session DB for the MVP. When Supabase Auth lands,
 * this is replaced by Supabase's JWT session — the `SessionPayload` shape
 * stays stable for the coach dashboard.
 */

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "swinglab-dev-secret-change-me";

export const SESSION_COOKIE="swinglab_session";
/** 7 days in milliseconds. */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionPayload = {
  /** Coach slug this session belongs to. */
  coachSlug: string;
  /** Issued-at epoch ms. */
  issuedAt: number;
  /** Absolute expiry epoch ms. */
  expiresAt: number;
};

/** Build a fresh session payload for a coach slug. */
export function createSessionPayload(coachSlug: string): SessionPayload {
  const now = Date.now();
  return {
    coachSlug,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
  };
}

/** Sign a payload into an opaque token string. */
export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify a token. Returns the payload if valid + unexpired, else null. */
export function verifySession(token: string): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;

  const expectedSig = createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof payload.coachSlug !== "string") return null;
  if (typeof payload.expiresAt !== "number") return null;
  if (Date.now() > payload.expiresAt) return null;
  return payload;
}
