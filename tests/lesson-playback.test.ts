import { describe, expect, it } from "vitest";
import {
  buildLessonPlaybackManifest,
  type FreezeFrameNote,
} from "@/lib/lesson/playback";

function note(id: string, timecode: number): FreezeFrameNote {
  return {
    id,
    timecode,
    audioUrl: `/uploads/audio/${id}.webm`,
    audioDuration: 2,
    annotations: [],
    createdAt: 1700000000000 + timecode,
  };
}

describe("buildLessonPlaybackManifest", () => {
  it("sorts freeze-frame notes by timecode", () => {
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [note("late", 5), note("early", 1)],
    });

    expect(manifest.status).toBe("processed");
    expect(manifest.notes.map((n) => n.id)).toEqual(["early", "late"]);
  });

  it("requires a video URL", () => {
    expect(() =>
      buildLessonPlaybackManifest({ videoUrl: "", notes: [note("one", 1)] }),
    ).toThrow(/videoUrl/i);
  });

  it("requires at least one note", () => {
    expect(() =>
      buildLessonPlaybackManifest({ videoUrl: "/uploads/swing.mp4", notes: [] }),
    ).toThrow(/freeze-frame note/i);
  });

  it("rejects invalid note timing or audio", () => {
    expect(() =>
      buildLessonPlaybackManifest({
        videoUrl: "/uploads/swing.mp4",
        notes: [{ ...note("bad", 1), audioDuration: 0 }],
      }),
    ).toThrow(/audioDuration/i);
  });
});
