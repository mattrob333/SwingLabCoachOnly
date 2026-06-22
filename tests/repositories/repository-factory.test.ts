import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Wave 1 Task 5 — Repository interface layer.
 *
 * Tests the env-gated factory selection for all four domain repositories
 * (submissions, coaches, earnings, playback manifests). Mirrors the storage
 * adapter factory pattern: mock when env keys absent, live (Supabase impl)
 * when present. The Supabase impls make real PostgREST fetch() calls (Wave 1
 * Slice D) — behavior is tested in tests/repositories/supabase-impls.test.ts.
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

    it("Supabase impl is selected in live mode (Wave 1 Slice D — real PostgREST queries)", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      const repo = mod.getSubmissionRepository();
      expect(repo.mode).toBe("live");
      // The impl now makes real fetch() calls — behavior tested in
      // tests/repositories/supabase-impls.test.ts with mocked fetch.
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

    it("Supabase impl selected in live mode (Slice D — real PostgREST)", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getCoachRepository().mode).toBe("live");
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

    it("Supabase impl selected in live mode (Slice D — real PostgREST)", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getEarningRepository().mode).toBe("live");
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

    it("Supabase impl selected in live mode (Slice D — real PostgREST)", async () => {
      stubLive();
      const mod = await import("@/lib/repositories");
      mod._resetAllRepositoriesForTests();
      expect(mod.getPlaybackManifestRepository().mode).toBe("live");
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
