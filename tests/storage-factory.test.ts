import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("storage factory (getStorageAdapter)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns a mock adapter when Supabase keys are absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getStorageAdapter, _resetStorageAdapterForTests } = await import(
      "@/lib/storage"
    );
    _resetStorageAdapterForTests();
    const adapter = getStorageAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("returns a live (Supabase) adapter when env keys are present", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://demo.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    const { getStorageAdapter, _resetStorageAdapterForTests } = await import(
      "@/lib/storage"
    );
    _resetStorageAdapterForTests();
    const adapter = getStorageAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("caches the adapter instance across calls", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getStorageAdapter, _resetStorageAdapterForTests } = await import(
      "@/lib/storage"
    );
    _resetStorageAdapterForTests();
    const a = getStorageAdapter();
    const b = getStorageAdapter();
    expect(a).toBe(b);
  });
});
