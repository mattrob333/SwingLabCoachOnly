import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeManifest(): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: [
      {
        id: "note-1",
        timecode: 0,
        audioUrl: "https://example.com/audio/note-1.webm",
        audioDuration: 3,
        annotations: [],
        createdAt: 1700000000000,
        transcript: "Keep your elbow up and follow through.",
      },
      {
        id: "note-2",
        timecode: 5,
        audioUrl: "https://example.com/audio/note-2.webm",
        audioDuration: 4,
        annotations: [],
        createdAt: 1700000000000,
        transcript: "Good weight transfer on this one.",
      },
    ],
    createdAt: 1700000000000,
    status: "processed",
    version: 1,
  };
}

function mockOpenAIResponse(noteTitles: unknown, summary: string): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({ noteTitles, summary }),
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("OpenAIPackagingAdapter", () => {
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
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");
    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    expect(adapter.mode).toBe("live");
  });

  it("throws when constructed without OPENAI_API_KEY", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    expect(() => new OpenAIPackagingAdapter()).toThrow("OPENAI_API_KEY");
  });

  it("packages a manifest via the OpenAI Chat Completions API", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      mockOpenAIResponse(
        [
          { noteId: "note-1", title: "Elbow up and follow through" },
          { noteId: "note-2", title: "Good weight transfer" },
        ],
        "Coach highlighted two moments: keeping the elbow up and weight transfer.",
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("live");
    expect(result.provider).toBe("openai");
    expect(result.noteTitles).toHaveLength(2);
    expect(result.noteTitles![0]).toEqual({
      noteId: "note-1",
      title: "Elbow up and follow through",
    });
    expect(result.summary).toBe(
      "Coach highlighted two moments: keeping the elbow up and weight transfer.",
    );

    // Verify the fetch call
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(opts?.method).toBe("POST");
    const headers = opts?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer oai_test_key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts?.body as string);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    // The guardrail text should appear in the system prompt.
    expect(body.messages[0].content).toContain("NEVER invent");
  });

  it("includes coach name in the user message when provided", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      mockOpenAIResponse([], "Summary."),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    await adapter.package({
      submissionId: "sub-1",
      coachName: "Coach Marcus",
      manifest: makeManifest(),
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.messages[1].content).toContain("Coach Marcus");
  });

  it("includes each noteId and transcript in the user message", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue(
      mockOpenAIResponse([], "Summary."),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    const userContent = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
      .messages[1].content as string;
    expect(userContent).toContain("note-1");
    expect(userContent).toContain("note-2");
    expect(userContent).toContain("Keep your elbow up");
  });

  it("returns failure on API error response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response('{"error":"Invalid API key"}', {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.mode).toBe("live");
    expect(result.noteTitles).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.error).toContain("401");
  });

  it("returns failure when submissionId is empty", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.error).toContain("submissionId");
  });

  it("returns failure when manifest has no notes", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: { ...makeManifest(), notes: [] },
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.error).toContain("note");
  });

  it("returns failure when OpenAI returns empty content", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.error).toContain("empty response");
  });

  it("returns failure when OpenAI returns malformed JSON", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "This is not JSON." } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.error).toContain("JSON");
  });

  it("returns failure when OpenAI response missing noteTitles array", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: JSON.stringify({ summary: "ok" }) } },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("noteTitles");
  });

  it("extracts JSON from markdown-fenced responses", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    const fencedContent =
      "```json\n" +
      JSON.stringify({
        noteTitles: [{ noteId: "note-1", title: "Elbow up" }],
        summary: "Summary.",
      }) +
      "\n```";

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: fencedContent } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(true);
    expect(result.noteTitles).toHaveLength(1);
    expect(result.noteTitles![0].title).toBe("Elbow up");
  });

  it("handles network errors gracefully", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockRejectedValue(
      new Error("Network connection refused"),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.error).toContain("Network connection refused");
  });

  it("logs to console when packaging successfully", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      mockOpenAIResponse(
        [{ noteId: "note-1", title: "Elbow up" }],
        "Summary.",
      ),
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("[packaging:openai]");
    expect(joined).toContain("sub-1");
    logSpy.mockRestore();
  });

  it("does not include error field on success", async () => {
    vi.stubEnv("OPENAI_API_KEY", "oai_test_key");

    vi.spyOn(global, "fetch").mockResolvedValue(
      mockOpenAIResponse(
        [{ noteId: "note-1", title: "Elbow up" }],
        "Summary.",
      ),
    );

    const { OpenAIPackagingAdapter } = await import(
      "@/lib/packaging/openai-packaging"
    );
    const adapter = new OpenAIPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest(),
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
