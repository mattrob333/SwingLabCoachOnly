import { describe, expect, it } from "vitest";
import {
  buildLessonPlaybackManifest,
  type FreezeFrameNote,
  type LessonPlaybackInput,
  type TranscriptStatus,
} from "@/lib/lesson/playback";

function baseNote(id: string): FreezeFrameNote {
  return {
    id,
    timecode: 1,
    audioUrl: `/uploads/audio/${id}.webm`,
    audioDuration: 2,
    annotations: [],
    createdAt: 1700000000000,
  };
}

describe("FreezeFrameNote transcript extensions", () => {
  it("defaults transcriptStatus to 'pending' when not provided", () => {
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [baseNote("n1")],
    });
    expect(manifest.notes[0].transcriptStatus).toBe("pending");
  });

  it("preserves provided transcript fields", () => {
    const note: FreezeFrameNote = {
      ...baseNote("n2"),
      thumbnailUrl: "/uploads/thumb/n2.jpg",
      transcriptRaw: "raw words here",
      transcriptEdited: "edited words",
      transcriptStatus: "ready",
      transcriptProvider: "deepgram",
      transcriptError: undefined,
    };
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [note],
    });
    const out = manifest.notes[0];
    expect(out.thumbnailUrl).toBe("/uploads/thumb/n2.jpg");
    expect(out.transcriptRaw).toBe("raw words here");
    expect(out.transcriptEdited).toBe("edited words");
    expect(out.transcriptStatus).toBe("ready");
    expect(out.transcriptProvider).toBe("deepgram");
  });

  it("accepts every TranscriptStatus literal", () => {
    const statuses: TranscriptStatus[] = [
      "pending",
      "transcribing",
      "ready",
      "error",
    ];
    for (const status of statuses) {
      const manifest = buildLessonPlaybackManifest({
        videoUrl: "/uploads/swing.mp4",
        notes: [{ ...baseNote(`n-${status}`), transcriptStatus: status }],
      });
      expect(manifest.notes[0].transcriptStatus).toBe(status);
    }
  });

  it("preserves transcriptError when status is 'error'", () => {
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [
        {
          ...baseNote("n-err"),
          transcriptStatus: "error",
          transcriptError: "Deepgram 502",
          transcriptProvider: "deepgram",
        },
      ],
    });
    expect(manifest.notes[0].transcriptError).toBe("Deepgram 502");
  });
});

describe("LessonPlaybackManifest extensions", () => {
  it("defaults version to 1 and processedAt to createdAt", () => {
    const createdAt = 1700000000000;
    const manifest = buildLessonPlaybackManifest(
      { videoUrl: "/uploads/swing.mp4", notes: [baseNote("n1")] },
      createdAt,
    );
    expect(manifest.version).toBe(1);
    expect(manifest.processedAt).toBe(createdAt);
  });

  it("propagates submission metadata from input", () => {
    const input: LessonPlaybackInput = {
      videoUrl: "/uploads/swing.mp4",
      notes: [baseNote("n1")],
      submissionId: "sub-123",
      coachSlug: "marcus-reed",
      parentEmail: "parent@example.com",
      deliveryTokenId: "tok-abc",
      aiSummary: "Great swing progress; focus on hip rotation.",
    };
    const manifest = buildLessonPlaybackManifest(input);
    expect(manifest.submissionId).toBe("sub-123");
    expect(manifest.coachSlug).toBe("marcus-reed");
    expect(manifest.parentEmail).toBe("parent@example.com");
    expect(manifest.deliveryTokenId).toBe("tok-abc");
    expect(manifest.aiSummary).toBe("Great swing progress; focus on hip rotation.");
  });

  it("leaves optional delivery fields undefined when not provided", () => {
    const manifest = buildLessonPlaybackManifest({
      videoUrl: "/uploads/swing.mp4",
      notes: [baseNote("n1")],
    });
    expect(manifest.submissionId).toBeUndefined();
    expect(manifest.coachSlug).toBeUndefined();
    expect(manifest.parentEmail).toBeUndefined();
    expect(manifest.deliveryTokenId).toBeUndefined();
    expect(manifest.aiSummary).toBeUndefined();
  });
});
