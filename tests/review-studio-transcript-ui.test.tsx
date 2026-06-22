import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ReviewStudioClient } from "@/components/review/review-studio-client";
import { draftNotesKey } from "@/lib/review/draft-notes";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

// Mock browser-API-heavy child components so the studio shell renders without
// a real <video>, MediaRecorder, or canvas context.
vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder" />,
}));
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/test",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    transcript: "",
    transcriptStatus: "pending",
    annotations: [],
    ...overrides,
  };
}

function makeStore(): Map<string, string> {
  return new Map();
}

function stubLocalStorage(store: Map<string, string>) {
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
}

function seedDraft(
  store: Map<string, string>,
  submissionId: string,
  notes: FreezeFrameNote[],
) {
  store.set(
    draftNotesKey(submissionId),
    JSON.stringify({ notes, savedAt: 1700000001000 }),
  );
}

describe("ReviewStudioClient — transcript edit UI polish (Wave 3)", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = makeStore();
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the character count matching the displayed transcript length", () => {
    const note = makeNote({ transcript: "Keep your head still" }); // 20 chars
    seedDraft(store, "sub-1", [note]);

    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(getByText("20 characters")).toBeTruthy();
  });

  it("shows the 'Edited' badge when transcriptEdited differs from transcriptRaw", () => {
    const note = makeNote({
      transcriptRaw: "Original AI text",
      transcriptEdited: "Coach rewrote this note", // 23 chars
      transcript: "Coach rewrote this note",
    });
    seedDraft(store, "sub-1", [note]);

    const { getByText, queryByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(getByText("23 characters")).toBeTruthy();
    expect(queryByText(/^Edited$/)).toBeTruthy();
  });

  it("does not show the 'Edited' badge when transcript is unchanged from raw", () => {
    const note = makeNote({
      transcriptRaw: "Same text",
      transcriptEdited: "Same text", // identical → not edited
      transcript: "Same text",
    });
    seedDraft(store, "sub-1", [note]);

    const { queryByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(queryByText(/^Edited$/)).toBeNull();
  });

  it("does not show the 'Edited' badge for a pending note with no transcript", () => {
    const note = makeNote({ transcript: "", transcriptStatus: "pending" });
    seedDraft(store, "sub-1", [note]);

    const { queryByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(queryByText(/^Edited$/)).toBeNull();
  });
});
