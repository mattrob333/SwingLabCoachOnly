/**
 * Wave 2 Task 4 Sub-slice D part 2 — Lesson access token verification.
 *
 * Tests cover `verifyLessonAccess()` — the consumer-facing magic-link access
 * gate used by the `/lesson/[id]` page. It composes the repository lookup
 * (`getByToken`) with the pure `verifyDeliveryToken` logic and an
 * idempotent `markViewed` side effect.
 *
 * Cases: missing token, not-found, valid (+marks viewed), valid already-viewed
 * (no duplicate markViewed), expired, revoked, submission-id mismatch.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LessonDeliveryToken } from "@/lib/records";
import { DELIVERY_TOKENS } from "@/lib/repositories/in-memory-delivery-tokens";
import {
  getDeliveryTokenRepository,
  _resetAllRepositoriesForTests,
} from "@/lib/repositories";
import { verifyLessonAccess } from "@/lib/lesson/access";

/** Build a token record with sensible defaults; overrides applied on top. */
function makeToken(overrides: Partial<LessonDeliveryToken>): LessonDeliveryToken {
  const now = Date.now();
  return {
    id: "tok_test",
    submissionId: "sub-1",
    token: "magic-token-abc",
    parentEmail: "parent@example.com",
    createdAt: now - 1000,
    expiresAt: now + 1000 * 60 * 60, // 1h in the future
    ...overrides,
  };
}

describe("verifyLessonAccess", () => {
  beforeEach(() => {
    DELIVERY_TOKENS.length = 0;
    _resetAllRepositoriesForTests();
  });

  it("returns { ok: false, reason: 'missing' } when no token is provided", async () => {
    const result = await verifyLessonAccess({ submissionId: "sub-1" });
    expect(result).toEqual({ ok: false, reason: "missing" });
  });

  it("returns { ok: false, reason: 'missing' } for an empty/whitespace token", async () => {
    expect(await verifyLessonAccess({ submissionId: "sub-1", token: "" })).toEqual({
      ok: false,
      reason: "missing",
    });
    expect(await verifyLessonAccess({ submissionId: "sub-1", token: "   " })).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("grants access for a valid token and marks it viewed", async () => {
    DELIVERY_TOKENS.push(makeToken({}));
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "magic-token-abc",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token.token).toBe("magic-token-abc");
    }
    // Side effect: viewedAt now set
    expect(DELIVERY_TOKENS[0].viewedAt).toBeDefined();
  });

  it("does not call markViewed when the token was already viewed", async () => {
    const viewedAt = Date.now() - 5000;
    DELIVERY_TOKENS.push(makeToken({ viewedAt }));
    const repo = getDeliveryTokenRepository();
    const spy = vi.spyOn(repo, "markViewed");
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "magic-token-abc",
    });
    expect(result.ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    // viewedAt unchanged
    expect(DELIVERY_TOKENS[0].viewedAt).toBe(viewedAt);
  });

  it("returns { ok: false, reason: 'not_found' } for an unknown token", async () => {
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "does-not-exist",
    });
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns { ok: false, reason: 'expired' } for an expired token", async () => {
    const past = Date.now() - 1000;
    DELIVERY_TOKENS.push(makeToken({ expiresAt: past }));
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "magic-token-abc",
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
  });

  it("returns { ok: false, reason: 'revoked' } for a revoked token", async () => {
    DELIVERY_TOKENS.push(makeToken({ revokedAt: Date.now() - 1000 }));
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "magic-token-abc",
    });
    expect(result).toEqual({ ok: false, reason: "revoked" });
  });

  it("returns { ok: false, reason: 'mismatch' } when the token belongs to a different submission", async () => {
    DELIVERY_TOKENS.push(makeToken({ submissionId: "sub-other" }));
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "magic-token-abc",
    });
    expect(result).toEqual({ ok: false, reason: "mismatch" });
  });

  it("grants access when token is valid and submissionId matches (explicit match)", async () => {
    DELIVERY_TOKENS.push(makeToken({ submissionId: "sub-1", token: "tok-xyz" }));
    const result = await verifyLessonAccess({
      submissionId: "sub-1",
      token: "tok-xyz",
    });
    expect(result.ok).toBe(true);
  });
});
