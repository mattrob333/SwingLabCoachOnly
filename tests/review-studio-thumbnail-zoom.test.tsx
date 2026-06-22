import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import type { FreezeFrameNote } from "@/lib/lesson/playback";
import { draftNotesKey } from "@/lib/review/draft-notes";

// --- Mocks ---------------------------------------------------------------

vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder" />,
}));
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

// --- Helpers --------------------------------------------------------------

function makeNote(overrides: Partial<FreezeFrameNote> = {}): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/audio",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    thumbnailUrl: "data:image/jpeg;base64,thumb-A",
    transcript: "Keep your head still",
    transcriptStatus: "ready",
    annotations: [],
    ...overrides,
  };
}

function makeStore(): Map<string, string> {
  return new Map();
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

// --- Tests ----------------------------------------------------------------

describe("ReviewStudioClient — thumbnail zoom (Wave 3)", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = makeStore();
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the thumbnail as a clickable button", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const btn = await findByLabelText("Zoom thumbnail for note 1");
    expect(btn).toBeTruthy();
  });

  it("opens a lightbox showing the full-size image when the thumbnail is clicked", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText, findByAltText, queryByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // No dialog before click
    expect(queryByRole("dialog")).toBeNull();

    const btn = await findByLabelText("Zoom thumbnail for note 1");
    await act(async () => {
      fireEvent.click(btn);
    });

    // Dialog now present with the full-size image
    const dialog = await findByAltText("Frozen frame for note 1 (zoomed)");
    expect(dialog).toBeTruthy();
    expect((dialog as HTMLImageElement).src).toBe(
      "data:image/jpeg;base64,thumb-A",
    );
  });

  it("closes the lightbox when the Close button is clicked", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText, queryByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const btn = await findByLabelText("Zoom thumbnail for note 1");
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(queryByRole("dialog")).toBeTruthy();

    const closeBtn = await findByLabelText("Close zoomed image");
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(queryByRole("dialog")).toBeNull();
  });

  it("closes the lightbox when the Escape key is pressed", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [makeNote()]);
    const { findByLabelText, queryByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const btn = await findByLabelText("Zoom thumbnail for note 1");
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(queryByRole("dialog")).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(queryByRole("dialog")).toBeNull();
  });

  it("does not open a lightbox for notes without a thumbnail", async () => {
    const { ReviewStudioClient } = await import(
      "@/components/review/review-studio-client"
    );
    seedDraft(store, "sub-1", [
      makeNote({ thumbnailUrl: undefined, id: "note-nothumb" }),
    ]);
    const { queryByLabelText, queryByRole } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // No zoom button when there's no thumbnail
    expect(queryByLabelText("Zoom thumbnail for note 1")).toBeNull();
    expect(queryByRole("dialog")).toBeNull();
  });
});
