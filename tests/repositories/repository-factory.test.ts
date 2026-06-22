import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Wave 1 Task 5 — Repository interface layer.
 *
 * Tests the env-gated factory selection for all four domain repositories
 * (submissions, coaches, earnings, playback manifests). Mirrors the storage
 * adapter factory pattern: mock when env keys absent, live (Supabase stub)
 * when present. The Supabase impls are stubs that throw "not implemented"
 * — Wave 1 Slice D will fill them in with the real schema + queries.
 *
 * All repository methods are async (Wave 1 Task 7) — stub throw tests use
 * `await expect(...).rejects.toThrow(...)` and facade calls use `await`.
 *
 * Existing tests (submissions.test.ts, coaches.test.ts, earnings.test.ts,
 * lesson-playback-api.test.ts) remain the regression proof that the in-memory
 * implementations behave correctly through the facade free functions.
 */
describe("repository factories (env-gated)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  function stubEmpty() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  }
  function stubLive() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  }

  describe("getSubmissionRepository", () => {
    it("returns mock mode when DB env keys absent", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getSubmissionRepository().mode).toBe("mock");
    });

    it("returns live mode when DB env keys present", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getSubmissionRepository().mode).toBe("live");
    });

    it("caches the instance across calls", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getSubmissionRepository()).toBe(mod.getSubmissionRepository());
    });

    it("Supabase stub throws on create with not-implemented message", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getSubmissionRepository();
      await expect(
        repo.create({
          coachSlug: "x",
          parentEmail: "p@e.com",
          playerAge: 10,
          swingType: "baseball",
          notes: "",
        }),
      ).rejects.toThrow(/not.*implemented/i);
    });

    it("Supabase stub throws on reads too", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getSubmissionRepository();
      await expect(repo.getById("any")).rejects.toThrow(/not.*implemented/i);
      await expect(repo.getForCoach("any")).rejects.toThrow(/not.*implemented/i);
    });
  });

  describe("getCoachRepository", () => {
    it("returns mock mode when DB env keys absent", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getCoachRepository().mode).toBe("mock");
    });

    it("returns live mode when DB env keys present", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getCoachRepository().mode).toBe("live");
    });

    it("caches the instance across calls", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getCoachRepository()).toBe(mod.getCoachRepository());
    });

    it("Supabase stub throws on getBySlug", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getCoachRepository();
      await expect(repo.getBySlug("any")).rejects.toThrow(/not.*implemented/i);
    });
  });

  describe("getEarningRepository", () => {
    it("returns mock mode when DB env keys absent", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getEarningRepository().mode).toBe("mock");
    });

    it("returns live mode when DB env keys present", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getEarningRepository().mode).toBe("live");
    });

    it("caches the instance across calls", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getEarningRepository()).toBe(mod.getEarningRepository());
    });

    it("Supabase stub throws on record", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getEarningRepository();
      await expect(
        repo.record({
          submissionId: "s1",
          coachSlug: "c1",
          amountUsd: 49,
          parentEmail: "p@e.com",
        }),
      ).rejects.toThrow(/not.*implemented/i);
    });
  });

  describe("getPlaybackManifestRepository", () => {
    it("returns mock mode when DB env keys absent", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getPlaybackManifestRepository().mode).toBe("mock");
    });

    it("returns live mode when DB env keys present", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getPlaybackManifestRepository().mode).toBe("live");
    });

    it("caches the instance across calls", async () => {
      stubEmpty();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getPlaybackManifestRepository()).toBe(
        mod.getPlaybackManifestRepository(),
      );
    });

    it("Supabase stub throws on save", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getPlaybackManifestRepository();
      await expect(
        repo.save("sub-1", {
          videoUrl: "/v.mp4",
          notes: [],
          createdAt: 1,
          status: "processed",
          version: 1,
        }),
      ).rejects.toThrow(/not.*implemented/i);
    });
  });
});

/**
 * Smoke test: the facade free functions in lib/submissions.ts, lib/coaches.ts,
 * lib/earnings.ts delegate through the factory to the in-memory impl. This
 * catches a regression where the facade accidentally bypasses the factory
 * (which would mean Supabase mode never activates).
 */
describe("facade delegation (smoke)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  });
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("createSubmission delegates through the factory to the in-memory repo", async () => {
    const subMod = await import("@/lib/submissions");
    subMod.SUBMISSIONS.length = 0;
    const sub = await subMod.createSubmission({
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      playerAge: 12,
      swingType: "baseball",
      notes: "smoke",
    });
    expect(sub.status).toBe("pending_payment");
    expect((await subMod.getSubmissionById(sub.id))?.id).toBe(sub.id);
  });

  it("getCoachBySlug delegates through the factory", async () => {
    const coachMod = await import("@/lib/coaches");
    const coach = await coachMod.getCoachBySlug("marcus-reed");
    expect(coach?.slug).toBe("marcus-reed");
  });

  it("recordEarning delegates through the factory", async () => {
    const earnMod = await import("@/lib/earnings");
    earnMod.EARNINGS.length = 0;
    const e = await earnMod.recordEarning({
      submissionId: "smoke-1",
      coachSlug: "marcus-reed",
      amountUsd: 49,
      parentEmail: "p@e.com",
    });
    expect((await earnMod.getEarningForSubmission("smoke-1"))?.id).toBe(e.id);
  });
});
