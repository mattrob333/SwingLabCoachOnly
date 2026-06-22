/**
 * Wave 2 Task 4 Sub-slice B — LessonDeliveryToken repository + verification.
 *
 * Tests cover:
 * - In-memory repository CRUD (create, getByToken, getBySubmissionId,
 *   markViewed, revoke)
 * - Token verification logic (verifyDeliveryToken): valid, expired, revoked,
 *   not-found
 * - Factory selection (mock → InMemory, live → Supabase stub)
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { LessonDeliveryToken } from "@/lib/records";
import {
  getDeliveryTokenRepository,
  _resetAllRepositoriesForTests,
  verifyDeliveryToken,
  type LessonDeliveryTokenRepository,
} from "@/lib/repositories";
import { DELIVERY_TOKENS } from "@/lib/repositories/in-memory-delivery-tokens";

// ---------------------------------------------------------------------------
// In-memory repository tests
// ---------------------------------------------------------------------------

describe("InMemoryDeliveryTokenRepository", () => {
  let repo: LessonDeliveryTokenRepository;

  beforeEach(() => {
    DELIVERY_TOKENS.length = 0;
    _resetAllRepositoriesForTests();
    repo = getDeliveryTokenRepository();
    expect(repo.mode).toBe("mock");
  });

  describe("create", () => {
    it("creates a token record and persists it", async () => {
      const token = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
      });
      expect(token.id).toMatch(/^tok_/);
      expect(token.submissionId).toBe("sub-1");
      expect(token.parentEmail).toBe("parent@example.com");
      expect(token.token).toHaveLength(48); // 24 bytes → 48 hex chars
      expect(token.createdAt).toBeGreaterThan(0);
      expect(token.expiresAt).toBeGreaterThan(token.createdAt);
      // Default TTL is 30 days
      expect(token.expiresAt - token.createdAt).toBe(30 * 24 * 60 * 60 * 1000);
      expect(token.viewedAt).toBeUndefined();
      expect(token.revokedAt).toBeUndefined();
      // Persisted
      expect(DELIVERY_TOKENS).toHaveLength(1);
      expect(DELIVERY_TOKENS[0].id).toBe(token.id);
    });

    it("respects custom ttlDays", async () => {
      const token = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
        ttlDays: 7,
      });
      expect(token.expiresAt - token.createdAt).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("respects custom createdAt", async () => {
      const fixedTime = 1700000000000;
      const token = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
        createdAt: fixedTime,
      });
      expect(token.createdAt).toBe(fixedTime);
      expect(token.expiresAt).toBe(fixedTime + 30 * 24 * 60 * 60 * 1000);
    });

    it("generates unique tokens for each create", async () => {
      const t1 = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
      });
      const t2 = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
      });
      expect(t1.token).not.toBe(t2.token);
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe("getByToken", () => {
    it("returns the token record by its opaque token string", async () => {
      const created = await repo.create({
        submissionId: "sub-1",
        parentEmail: "parent@example.com",
      });
      const found = await repo.getByToken(created.token);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it("returns undefined for an unknown token", async () => {
      const found = await repo.getByToken("nonexistent-token-string");
      expect(found).toBeUndefined();
    });
  });

  describe("getBySubmissionId", () => {
    it("returns all tokens for a submission, newest-first", async () => {
      const t1 = await repo.create({
        submissionId: "sub-1",
        parentEmail: "p@example.com",
        createdAt: 1000000,
      });
      const t2 = await repo.create({
        submissionId: "sub-1",
        parentEmail: "p@example.com",
        createdAt: 2000000,
      });
      const t3 = await repo.create({
        submissionId: "sub-2",
        parentEmail: "p@example.com",
      });
      const tokens = await repo.getBySubmissionId("sub-1");
      expect(tokens).toHaveLength(2);
      expect(tokens[0].id).toBe(t2.id); // newer first
      expect(tokens[1].id).toBe(t1.id);
      // t3 belongs to a different submission
      expect(tokens.find((t) => t.id === t3.id)).toBeUndefined();
    });

    it("returns empty array when no tokens exist for the submission", async () => {
      const tokens = await repo.getBySubmissionId("sub-nope");
      expect(tokens).toEqual([]);
    });
  });

  describe("markViewed", () => {
    it("sets viewedAt to the current time", async () => {
      const created = await repo.create({
        submissionId: "sub-1",
        parentEmail: "p@example.com",
      });
      const before = Date.now();
      const updated = await repo.markViewed(created.id);
      const after = Date.now();
      expect(updated.viewedAt).toBeDefined();
      expect(updated.viewedAt!).toBeGreaterThanOrEqual(before);
      expect(updated.viewedAt!).toBeLessThanOrEqual(after);
      // Persisted
      const found = await repo.getByToken(created.token);
      expect(found?.viewedAt).toBeDefined();
    });

    it("throws when the token id does not exist", async () => {
      await expect(repo.markViewed("tok-nonexistent")).rejects.toThrow();
    });
  });

  describe("revoke", () => {
    it("sets revokedAt to the current time", async () => {
      const created = await repo.create({
        submissionId: "sub-1",
        parentEmail: "p@example.com",
      });
      const before = Date.now();
      const updated = await repo.revoke(created.id);
      const after = Date.now();
      expect(updated.revokedAt).toBeDefined();
      expect(updated.revokedAt!).toBeGreaterThanOrEqual(before);
      expect(updated.revokedAt!).toBeLessThanOrEqual(after);
      // Persisted
      const found = await repo.getByToken(created.token);
      expect(found?.revokedAt).toBeDefined();
    });

    it("throws when the token id does not exist", async () => {
      await expect(repo.revoke("tok-nonexistent")).rejects.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// verifyDeliveryToken — pure verification logic
// ---------------------------------------------------------------------------

describe("verifyDeliveryToken", () => {
  it("returns { valid: true } for a fresh, unviewed, unrevoked token", () => {
    const now = Date.now();
    const token: LessonDeliveryToken = {
      id: "tok-1",
      submissionId: "sub-1",
      token: "abc123",
      parentEmail: "p@example.com",
      createdAt: now - 1000,
      expiresAt: now + 1000,
    };
    const result = verifyDeliveryToken(token);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("returns { valid: false, reason: 'expired' } when expiresAt is in the past", () => {
    const now = Date.now();
    const token: LessonDeliveryToken = {
      id: "tok-1",
      submissionId: "sub-1",
      token: "abc123",
      parentEmail: "p@example.com",
      createdAt: now - 2000,
      expiresAt: now - 1000,
    };
    const result = verifyDeliveryToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("returns { valid: false, reason: 'revoked' } when revokedAt is set", () => {
    const now = Date.now();
    const token: LessonDeliveryToken = {
      id: "tok-1",
      submissionId: "sub-1",
      token: "abc123",
      parentEmail: "p@example.com",
      createdAt: now - 2000,
      expiresAt: now + 1000,
      revokedAt: now - 500,
    };
    const result = verifyDeliveryToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("revoked");
  });

  it("returns undefined (not found) when token is null", () => {
    const result = verifyDeliveryToken(null);
    expect(result).toBeUndefined();
  });

  it("returns undefined when token is undefined", () => {
    const result = verifyDeliveryToken(undefined);
    expect(result).toBeUndefined();
  });

  it("treats a token expiring exactly now as expired", () => {
    const now = Date.now();
    const token: LessonDeliveryToken = {
      id: "tok-1",
      submissionId: "sub-1",
      token: "abc123",
      parentEmail: "p@example.com",
      createdAt: now - 2000,
      expiresAt: now,
    };
    const result = verifyDeliveryToken(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });
});

// ---------------------------------------------------------------------------
// Factory selection
// ---------------------------------------------------------------------------

describe("getDeliveryTokenRepository factory", () => {
  beforeEach(() => {
    DELIVERY_TOKENS.length = 0;
    _resetAllRepositoriesForTests();
  });

  it("returns InMemory impl in mock mode (default)", () => {
    const repo = getDeliveryTokenRepository();
    expect(repo.mode).toBe("mock");
  });

  it("caches the singleton (same instance on repeated calls)", () => {
    const r1 = getDeliveryTokenRepository();
    const r2 = getDeliveryTokenRepository();
    expect(r1).toBe(r2);
  });

  it("returns a fresh instance after _resetAllRepositoriesForTests", () => {
    const r1 = getDeliveryTokenRepository();
    _resetAllRepositoriesForTests();
    const r2 = getDeliveryTokenRepository();
    expect(r1).not.toBe(r2);
    expect(r2.mode).toBe("mock");
  });
});
