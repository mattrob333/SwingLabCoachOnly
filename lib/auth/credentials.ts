import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { COACHES } from "@/lib/coaches";

/**
 * MVP coach credential store (Phase 2).
 *
 * Passwords are hashed with scrypt (salt:hash, hex). In production this lives
 * in Supabase `auth.users`; the surface here (`verifyCoachCredentials`,
 * `coachExists`) is designed so the swap is a drop-in.
 *
 * See docs/DECISIONS.md — "Backend & Auth" (Supabase default).
 */

/** Returns `salt:hash` for a password. Pass an explicit salt for determinism. */
export function hashPassword(password: string, saltHex?: string): string {
  const salt = saltHex ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Constant-time password verification against a `salt:hash` string. */
export function verifyPassword(password: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const hash = stored.slice(sep + 1);
  const computed = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (computed.length !== storedBuf.length) return false;
  return timingSafeEqual(computed, storedBuf);
}

/**
 * Default MVP password for all seeded coach accounts.
 * Real accounts are provisioned via Supabase Auth in production.
 */
export const DEFAULT_MVP_PASSWORD = "swinglab123";

const credentialStore = new Map<string, string>(
  COACHES.map((c) => [c.slug, hashPassword(DEFAULT_MVP_PASSWORD)])
);

/** True if any credential record exists for the given coach slug. */
export function coachExists(slug: string): boolean {
  return credentialStore.has(slug);
}

/** Verify a coach slug + password pair. Constant-time on the hash compare. */
export function verifyCoachCredentials(slug: string, password: string): boolean {
  const stored = credentialStore.get(slug);
  if (!stored) return false;
  return verifyPassword(password, stored);
}
