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

describe("ReviewStudioClient — autosave indicator (slice 2c)", () => {
  let store: Map<string, string>;

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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not show the Autosaved indicator when no draft exists", () => {
    const { queryByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(queryByText(/^Autosaved/)).toBeNull();
  });

  it("shows the Autosaved indicator when a draft exists in localStorage", () => {
    const draftNotes = [makeNote()];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(getByText(/^Autosaved/)).toBeTruthy();
  });

  it("renders the Coach Notes section heading", () => {
    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(getByText("Coach Notes")).toBeTruthy();
  });
});
