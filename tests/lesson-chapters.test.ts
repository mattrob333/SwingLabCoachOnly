import { describe, it, expect } from "vitest";
import { buildChapterList } from "@/lib/lesson/chapters";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeNote(overrides: Partial<{
  id: string;
  timecode: number;
  audioUrl: string;
  audioDuration: number;
  thumbnailUrl: string;
  transcript: string;
  transcriptRaw: string;
  transcriptEdited: string;
}> = {}) {
  return {
    id: overrides.id ?? "note-1",
    timecode: overrides.timecode ?? 5,
    audioUrl: overrides.audioUrl ?? "https://example.com/audio1.mp3",
    audioDuration: overrides.audioDuration ?? 3,
    thumbnailUrl: overrides.thumbnailUrl,
    transcript: overrides.transcript,
    transcriptRaw: overrides.transcriptRaw,
    transcriptEdited: overrides.transcriptEdited,
    annotations: [],
    createdAt: 1700000000000,
  };
}

function makeManifest(
  notes: ReturnType<typeof makeNote>[],
  extras: Partial<LessonPlaybackManifest> = {},
): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes,
    createdAt: 1700000000000,
    status: "approved",
    version: 1,
    ...extras,
  };
}

describe("buildChapterList", () => {
  it("returns an empty array for a manifest with no notes", () => {
    const manifest = makeManifest([]);
    expect(buildChapterList(manifest)).toEqual([]);
  });

  it("returns chapters sorted by timecode ascending", () => {
    const manifest = makeManifest([
      makeNote({ id: "n3", timecode: 30 }),
      makeNote({ id: "n1", timecode: 5 }),
      makeNote({ id: "n2", timecode: 15 }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters.map((c) => c.id)).toEqual(["n1", "n2", "n3"]);
  });

  it("uses aiNoteTitles title when available", () => {
    const manifest = makeManifest(
      [makeNote({ id: "n1" })],
      { aiNoteTitles: [{ noteId: "n1", title: "Grip Position" }] },
    );
    const chapters = buildChapterList(manifest);
    expect(chapters[0].title).toBe("Grip Position");
  });

  it("falls back to 'Note N' when no aiNoteTitle matches", () => {
    const manifest = makeManifest([
      makeNote({ id: "n1" }),
      makeNote({ id: "n2" }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].title).toBe("Note 1");
    expect(chapters[1].title).toBe("Note 2");
  });

  it("falls back to 'Note N' when aiNoteTitles is absent", () => {
    const manifest = makeManifest([makeNote({ id: "n1" })]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].title).toBe("Note 1");
  });

  it("includes thumbnailUrl when present", () => {
    const manifest = makeManifest([
      makeNote({ id: "n1", thumbnailUrl: "https://example.com/thumb.jpg" }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });

  it("thumbnailUrl is undefined when not present", () => {
    const manifest = makeManifest([makeNote({ id: "n1" })]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].thumbnailUrl).toBeUndefined();
  });

  it("uses transcriptEdited when available", () => {
    const manifest = makeManifest([
      makeNote({
        id: "n1",
        transcriptRaw: "raw text",
        transcriptEdited: "edited text",
        transcript: "legacy text",
      }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].transcript).toBe("edited text");
  });

  it("uses transcriptRaw when transcriptEdited is absent", () => {
    const manifest = makeManifest([
      makeNote({ id: "n1", transcriptRaw: "raw text", transcript: "legacy" }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].transcript).toBe("raw text");
  });

  it("uses legacy transcript when raw/edited are absent", () => {
    const manifest = makeManifest([
      makeNote({ id: "n1", transcript: "legacy text" }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].transcript).toBe("legacy text");
  });

  it("transcript is undefined when no transcript fields present", () => {
    const manifest = makeManifest([makeNote({ id: "n1" })]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].transcript).toBeUndefined();
  });

  it("includes timecode and audioDuration", () => {
    const manifest = makeManifest([
      makeNote({ id: "n1", timecode: 12.5, audioDuration: 4 }),
    ]);
    const chapters = buildChapterList(manifest);
    expect(chapters[0].timecode).toBe(12.5);
    expect(chapters[0].audioDuration).toBe(4);
  });

  it("handles a mix of titled and untitled notes", () => {
    const manifest = makeManifest(
      [
        makeNote({ id: "n1" }),
        makeNote({ id: "n2" }),
        makeNote({ id: "n3" }),
      ],
      {
        aiNoteTitles: [
          { noteId: "n2", title: "Backswing" },
          { noteId: "n3", title: "Follow-through" },
        ],
      },
    );
    const chapters = buildChapterList(manifest);
    expect(chapters.map((c) => c.title)).toEqual([
      "Note 1",
      "Backswing",
      "Follow-through",
    ]);
  });

  it("formatChapterTime returns M:SS format", async () => {
    const { formatChapterTime } = await import("@/lib/lesson/chapters");
    expect(formatChapterTime(0)).toBe("0:00");
    expect(formatChapterTime(5)).toBe("0:05");
    expect(formatChapterTime(65)).toBe("1:05");
    expect(formatChapterTime(125.7)).toBe("2:05");
  });
});
