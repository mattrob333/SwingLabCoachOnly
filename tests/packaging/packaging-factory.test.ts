import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("packaging adapter factory (getPackagingAdapter)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a mock adapter when OPENAI_API_KEY is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const {
      getPackagingAdapter,
      _resetPackagingAdapterForTests,
    } = await import("@/lib/packaging");
    _resetPackagingAdapterForTests();
    const adapter = getPackagingAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("returns a live (OpenAI) adapter when OPENAI_API_KEY is present", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_live_key");

    const {
      getPackagingAdapter,
      _resetPackagingAdapterForTests,
    } = await import("@/lib/packaging");
    _resetPackagingAdapterForTests();
    const adapter = getPackagingAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("returns a mock adapter when OPENAI_API_KEY is whitespace", async () => {
    vi.stubEnv("OPENAI_API_KEY", "   ");

    const {
      getPackagingAdapter,
      _resetPackagingAdapterForTests,
    } = await import("@/lib/packaging");
    _resetPackagingAdapterForTests();
    const adapter = getPackagingAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("caches the adapter instance across calls", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const {
      getPackagingAdapter,
      _resetPackagingAdapterForTests,
    } = await import("@/lib/packaging");
    _resetPackagingAdapterForTests();
    const a = getPackagingAdapter();
    const b = getPackagingAdapter();
    expect(a).toBe(b);
  });

  it("returns a new instance after _resetPackagingAdapterForTests", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const mod = await import("@/lib/packaging");
    mod._resetPackagingAdapterForTests();
    const a = mod.getPackagingAdapter();
    mod._resetPackagingAdapterForTests();
    const b = mod.getPackagingAdapter();
    expect(a).not.toBe(b);
  });

  it("switches from mock to live after env change + reset", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const mod1 = await import("@/lib/packaging");
    mod1._resetPackagingAdapterForTests();
    const mockAdapter = mod1.getPackagingAdapter();
    expect(mockAdapter.mode).toBe("mock");

    vi.stubEnv("OPENAI_API_KEY", "oai_live_key");

    const mod2 = await import("@/lib/packaging");
    mod2._resetPackagingAdapterForTests();
    const liveAdapter = mod2.getPackagingAdapter();
    expect(liveAdapter.mode).toBe("live");
  });
});
