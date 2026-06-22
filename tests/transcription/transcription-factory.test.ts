import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("transcription adapter factory (getTranscriptionAdapter)", () => {
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

  it("returns a mock adapter when DEEPGRAM_API_KEY is absent", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const {
      getTranscriptionAdapter,
      _resetTranscriptionAdapterForTests,
    } = await import("@/lib/transcription");
    _resetTranscriptionAdapterForTests();
    const adapter = getTranscriptionAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("returns a live (Deepgram) adapter when DEEPGRAM_API_KEY is present", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_live_key");

    const {
      getTranscriptionAdapter,
      _resetTranscriptionAdapterForTests,
    } = await import("@/lib/transcription");
    _resetTranscriptionAdapterForTests();
    const adapter = getTranscriptionAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("returns a mock adapter when DEEPGRAM_API_KEY is empty string", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "   ");

    const {
      getTranscriptionAdapter,
      _resetTranscriptionAdapterForTests,
    } = await import("@/lib/transcription");
    _resetTranscriptionAdapterForTests();
    const adapter = getTranscriptionAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("caches the adapter instance across calls", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const {
      getTranscriptionAdapter,
      _resetTranscriptionAdapterForTests,
    } = await import("@/lib/transcription");
    _resetTranscriptionAdapterForTests();
    const a = getTranscriptionAdapter();
    const b = getTranscriptionAdapter();
    expect(a).toBe(b);
  });

  it("returns a new instance after _resetTranscriptionAdapterForTests", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const mod = await import("@/lib/transcription");
    mod._resetTranscriptionAdapterForTests();
    const a = mod.getTranscriptionAdapter();
    mod._resetTranscriptionAdapterForTests();
    const b = mod.getTranscriptionAdapter();
    expect(a).not.toBe(b);
  });

  it("switches from mock to live after env change + reset", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    const mod1 = await import("@/lib/transcription");
    mod1._resetTranscriptionAdapterForTests();
    const mockAdapter = mod1.getTranscriptionAdapter();
    expect(mockAdapter.mode).toBe("mock");

    vi.stubEnv("DEEPGRAM_API_KEY", "dg_live_key");

    const mod2 = await import("@/lib/transcription");
    mod2._resetTranscriptionAdapterForTests();
    const liveAdapter = mod2.getTranscriptionAdapter();
    expect(liveAdapter.mode).toBe("live");
  });
});
