import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("email adapter factory (getEmailAdapter)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("returns a mock adapter when RESEND_API_KEY is absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const {
      getEmailAdapter,
      _resetEmailAdapterForTests,
    } = await import("@/lib/email");
    _resetEmailAdapterForTests();
    const adapter = getEmailAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("returns a live (Resend) adapter when RESEND_API_KEY is present", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");

    const {
      getEmailAdapter,
      _resetEmailAdapterForTests,
    } = await import("@/lib/email");
    _resetEmailAdapterForTests();
    const adapter = getEmailAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("returns a mock adapter when RESEND_API_KEY is empty string", async () => {
    vi.stubEnv("RESEND_API_KEY", "   ");

    const {
      getEmailAdapter,
      _resetEmailAdapterForTests,
    } = await import("@/lib/email");
    _resetEmailAdapterForTests();
    const adapter = getEmailAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("caches the adapter instance across calls", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const {
      getEmailAdapter,
      _resetEmailAdapterForTests,
    } = await import("@/lib/email");
    _resetEmailAdapterForTests();
    const a = getEmailAdapter();
    const b = getEmailAdapter();
    expect(a).toBe(b);
  });

  it("returns a new instance after _resetEmailAdapterForTests", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const mod = await import("@/lib/email");
    mod._resetEmailAdapterForTests();
    const a = mod.getEmailAdapter();
    mod._resetEmailAdapterForTests();
    const b = mod.getEmailAdapter();
    expect(a).not.toBe(b);
  });

  it("switches from mock to live after env change + reset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const mod1 = await import("@/lib/email");
    mod1._resetEmailAdapterForTests();
    const mockAdapter = mod1.getEmailAdapter();
    expect(mockAdapter.mode).toBe("mock");

    vi.stubEnv("RESEND_API_KEY", "re_live_key");

    const mod2 = await import("@/lib/email");
    mod2._resetEmailAdapterForTests();
    const liveAdapter = mod2.getEmailAdapter();
    expect(liveAdapter.mode).toBe("live");
  });
});
