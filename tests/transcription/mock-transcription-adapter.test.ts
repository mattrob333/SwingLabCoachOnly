import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MockTranscriptionAdapter,
  MOCK_TRANSCRIPTIONS,
} from "@/lib/transcription/mock-transcription";

describe("MockTranscriptionAdapter", () => {
  beforeEach(() => {
    MOCK_TRANSCRIPTIONS.length = 0;
  });

  it("has mode 'mock'", () => {
    const adapter = new MockTranscriptionAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("transcribes audio and returns success with a transcript", async () => {
    const adapter = new MockTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("mock");
    expect(result.provider).toBe("mock");
    expect(result.transcript).toBeTruthy();
    expect(typeof result.transcript).toBe("string");
  });

  it("stores the transcription in MOCK_TRANSCRIPTIONS for inspection", async () => {
    const adapter = new MockTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(MOCK_TRANSCRIPTIONS).toHaveLength(1);
    expect(MOCK_TRANSCRIPTIONS[0].submissionId).toBe("sub-1");
    expect(MOCK_TRANSCRIPTIONS[0].noteId).toBe("note-1");
    expect(MOCK_TRANSCRIPTIONS[0].audioUrl).toBe(
      "https://example.com/audio/note-1.webm",
    );
    expect(MOCK_TRANSCRIPTIONS[0].transcript).toBeTruthy();
    expect(MOCK_TRANSCRIPTIONS[0].transcribedAt).toBeGreaterThan(0);
  });

  it("logs to console when transcribing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const adapter = new MockTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("[transcription:mock]");
    expect(joined).toContain("note-1");
    logSpy.mockRestore();
  });

  it("returns failure when audioUrl is empty", async () => {
    const adapter = new MockTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("audio");
    expect(MOCK_TRANSCRIPTIONS).toHaveLength(0);
  });

  it("returns failure when noteId is empty", async () => {
    const adapter = new MockTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "",
    });

    expect(result.success).toBe(false);
    expect(result.transcript).toBeNull();
    expect(result.error).toContain("note");
    expect(MOCK_TRANSCRIPTIONS).toHaveLength(0);
  });

  it("produces a deterministic transcript based on the noteId", async () => {
    const adapter = new MockTranscriptionAdapter();
    const result1 = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });
    const result2 = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result1.transcript).toBe(result2.transcript);
  });

  it("accumulates multiple transcriptions in the store", async () => {
    const adapter = new MockTranscriptionAdapter();
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });
    await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-2.webm",
      submissionId: "sub-1",
      noteId: "note-2",
    });

    expect(MOCK_TRANSCRIPTIONS).toHaveLength(2);
    expect(MOCK_TRANSCRIPTIONS[0].noteId).toBe("note-1");
    expect(MOCK_TRANSCRIPTIONS[1].noteId).toBe("note-2");
  });

  it("does not include error field on success", async () => {
    const adapter = new MockTranscriptionAdapter();
    const result = await adapter.transcribe({
      audioUrl: "https://example.com/audio/note-1.webm",
      submissionId: "sub-1",
      noteId: "note-1",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
