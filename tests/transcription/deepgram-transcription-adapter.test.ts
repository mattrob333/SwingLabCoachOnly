import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("DeepgramTranscriptionAdapter", () => {
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

  it("has mode 'live'", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");
    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("throws when constructed without DEEPGRAM_API_KEY", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");
    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    expect(() => new DeepgramTranscriptionAdapter()).toThrow(
      "DEEPGRAM_API_KEY",
    );
  });

  it("transcribes audio via Deepgram API and returns success with transcript", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              channels: [
                {
                  alternatives: [
                    { transcript: "Keep your head down and follow through." },
                  ],
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.provider).toBe("deepgram");
    expect(result.transcript).toBe(
      "Keep your head down and follow through.",
    );

    // Verify the fetch call
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toContain("https://api.deepgram.com/v1/listen");
    expect(url).toContain("model=nova-2");
    expect(url).toContain("smart_format=true");
    expect(url).toContain("language=en");
    expect(opts?.method).toBe("POST");
    const headers = opts?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Token dg_test_key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts?.body as string);
    expect(body.url).toBe("https://example.com/audio/note-1.webm");
  });

  it("passes custom language when provided", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              channels: [{ alternatives: [{ transcript: "Hola" }] }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
      language: "es",
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("language=es");
    expect(url).not.toContain("language=en");
  });

  it("defaults to 'en' language when not specified", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              channels: [{ alternatives: [{ transcript: "Hello" }] }],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("language=en");
  });

  it("returns failure on API error response", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response('{"error":"Invalid API key"}', {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(false);
    expect(result.mode).toBe("live");
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("401");
  });

  it("returns failure when audioUrl is empty", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("audioUrl");
  });

  it("returns failure when noteId is empty", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("noteId");
  });

  it("returns failure when Deepgram returns empty transcript", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: { channels: [{ alternatives: [{ transcript: "" }] }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("empty transcript");
  });

  it("handles network errors gracefully", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("Network connection refused"),
    );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("Network connection refused");
  });

  it("logs to console when transcribing successfully", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: {
            channels: [{ alternatives: [{ transcript: "Good swing." }] }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("[transcription:deepgram]");
    expect(joined).toContain("note-1");
    logSpy.mockRestore();
  });

  it("does not include error field on success", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "dg_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: {
            channels: [{ alternatives: [{ transcript: "Nice hit." }] }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { DeepgramTranscriptionAdapter } = await import(
      "@/lib/transcription/deepgram-transcription"
    );
    const adapter = new DeepgramTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
