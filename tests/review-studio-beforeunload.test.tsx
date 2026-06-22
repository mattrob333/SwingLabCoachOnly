import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ReviewStudioClient } from "@/components/review/review-studio-client";
import { draftNotesKey } from "@/lib/review/draft-notes";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

// Mock browser-API-heavy child components so we can render the studio shell
// without a real <video>, MediaRecorder, or canvas context.
vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder" />,
}));
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

function makeNote(): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 1.5,
    audioUrl: "blob:http://localhost/test",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    transcript: "",
    transcriptStatus: "pending",
    annotations: [],
  };
}

describe("ReviewStudioClient — beforeunload warning wiring", () => {
  let store: Map<string, string>;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    });
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not add beforeunload listener when there are no notes", () => {
    render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const beforeUnloadAdds = addSpy.mock.calls.filter(
      ([e]) => e === "beforeunload",
    );
    expect(beforeUnloadAdds).toHaveLength(0);
  });

  it("adds beforeunload listener when draft notes are restored from localStorage", () => {
    const draftNotes = [makeNote()];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const beforeUnloadAdds = addSpy.mock.calls.filter(
      ([e]) => e === "beforeunload",
    );
    expect(beforeUnloadAdds).toHaveLength(1);
  });

  it("removes beforeunload listener on unmount", () => {
    const draftNotes = [makeNote()];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    const { unmount } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    unmount();

    const beforeUnloadRemoves = removeSpy.mock.calls.filter(
      ([e]) => e === "beforeunload",
    );
    expect(beforeUnloadRemoves).toHaveLength(1);
  });
});
