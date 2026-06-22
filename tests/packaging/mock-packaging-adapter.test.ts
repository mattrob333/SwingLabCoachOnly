import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MockPackagingAdapter,
  MOCK_PACKAGINGS,
} from "@/lib/packaging/mock-packaging";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeManifest(
  notes: Array<{ id: string; transcript?: string; transcriptRaw?: string; transcriptEdited?: string }>,
): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: notes.map((n, i) => ({
      id: n.id,
      timecode: i * 5,
      audioUrl: `https://example.com/audio/${n.id}.webm`,
      audioDuration: 3,
      annotations: [],
      createdAt: 1700000000000,
      transcript: n.transcript,
      transcriptRaw: n.transcriptRaw,
      transcriptEdited: n.transcriptEdited,
    })),
    createdAt: 1700000000000,
    status: "processed",
    version: 1,
  };
}

describe("MockPackagingAdapter", () => {
  beforeEach(() => {
    MOCK_PACKAGINGS.length = 0;
  });

  it("has mode 'mock'", () => {
    const adapter = new MockPackagingAdapter();
    expect(adapter.mode).toBe("mock");
  });

  it("packages a manifest and returns success with titles + summary", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([
        { id: "note-1", transcript: "Keep your elbow up and follow through." },
        { id: "note-2", transcript: "Good weight transfer on this one." },
      ]),
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("mock");
    expect(result.provider).toBe("mock");
    expect(result.noteTitles).not.toBeNull();
    expect(result.noteTitles).toHaveLength(2);
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });

  it("generates a title from the first few words of each note transcript", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([
        { id: "note-1", transcript: "Keep your elbow up and follow through smoothly." },
      ]),
    });

    expect(result.success).toBe(true);
    expect(result.noteTitles![0].noteId).toBe("note-1");
    expect(result.noteTitles![0].title).toBe("Keep your elbow up and");
  });

  it("prefers transcriptEdited over transcriptRaw over transcript", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([
        {
          id: "note-1",
          transcript: "raw legacy transcript words here",
          transcriptRaw: "raw transcript content here now",
          transcriptEdited: "edited coach words appear first",
        },
      ]),
    });

    expect(result.noteTitles![0].title).toBe("edited coach words appear first");
  });

  it("prefers transcriptRaw over legacy transcript when no edited", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([
        {
          id: "note-1",
          transcript: "legacy transcript text here",
          transcriptRaw: "raw transcript text here",
        },
      ]),
    });

    expect(result.noteTitles![0].title).toBe("raw transcript text here");
  });

  it("falls back to 'Moment N' label when a note has no transcript", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([{ id: "note-1" }, { id: "note-2" }]),
    });

    expect(result.noteTitles![0].title).toBe("Moment 1");
    expect(result.noteTitles![1].title).toBe("Moment 2");
  });

  it("strips trailing punctuation from the generated title", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([
        { id: "note-1", transcript: "Okay so, the grip is, too tight." },
      ]),
    });

    // first 5 words: "Okay so, the grip is," -> cleaned -> "Okay so, the grip is"
    expect(result.noteTitles![0].title).toBe("Okay so, the grip is");
  });

  it("includes coach name in the summary when provided", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      coachName: "Coach Marcus",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    expect(result.summary).toContain("Coach Marcus");
  });

  it("uses generic 'your coach' when coachName is omitted", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    expect(result.summary).toContain("your coach");
    expect(result.summary).not.toContain("undefined");
  });

  it("stores the packaging result in MOCK_PACKAGINGS for inspection", async () => {
    const adapter = new MockPackagingAdapter();
    await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    expect(MOCK_PACKAGINGS).toHaveLength(1);
    expect(MOCK_PACKAGINGS[0].submissionId).toBe("sub-1");
    expect(MOCK_PACKAGINGS[0].noteTitles).toHaveLength(1);
    expect(MOCK_PACKAGINGS[0].summary).toBeTruthy();
    expect(MOCK_PACKAGINGS[0].packagedAt).toBeGreaterThan(0);
  });

  it("logs to console when packaging", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const adapter = new MockPackagingAdapter();
    await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("[packaging:mock]");
    expect(joined).toContain("sub-1");
    logSpy.mockRestore();
  });

  it("returns failure when submissionId is empty", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.error).toContain("submissionId");
    expect(MOCK_PACKAGINGS).toHaveLength(0);
  });

  it("returns failure when manifest has no notes", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: { ...makeManifest([]), notes: [] },
    });

    expect(result.success).toBe(false);
    expect(result.noteTitles).toBeNull();
    expect(result.summary).toBeNull();
    expect(result.error).toContain("note");
    expect(MOCK_PACKAGINGS).toHaveLength(0);
  });

  it("produces deterministic output for the same input", async () => {
    const adapter = new MockPackagingAdapter();
    const manifest = makeManifest([
      { id: "note-1", transcript: "Keep your head down." },
      { id: "note-2", transcript: "Follow through completely." },
    ]);

    const r1 = await adapter.package({ submissionId: "sub-1", manifest });
    const r2 = await adapter.package({ submissionId: "sub-1", manifest });

    expect(r1.noteTitles).toEqual(r2.noteTitles);
    expect(r1.summary).toBe(r2.summary);
  });

  it("does not include error field on success", async () => {
    const adapter = new MockPackagingAdapter();
    const result = await adapter.package({
      submissionId: "sub-1",
      manifest: makeManifest([{ id: "note-1", transcript: "Nice swing." }]),
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
