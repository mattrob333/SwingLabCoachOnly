import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
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

function makeNote(): FreezeFrameNote {
  return {
    id: "note-1",
    timecode: 12.5,
    audioUrl: "blob:http://localhost/audio",
    audioDuration: 3.2,
    createdAt: 1700000000000,
    thumbnailUrl: "data:image/jpeg;base64,thumb",
    transcript: "Keep your head still",
    transcriptStatus: "ready",
    annotations: [],
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

/**
 * Wave 3 — Mobile touch targets for note card action buttons.
 *
 * The Camera (retake), RotateCcw (re-record), and Trash2 (delete) buttons on
 * each note card use `size="sm"` which gives them `h-7` (28px) — too small for
 * a comfortable touch target on mobile. They should be bumped to `h-10` (40px)
 * on mobile while reverting to `h-7` on `sm+` screens.
 */
describe("ReviewStudioClient — note card touch targets (Wave 3)", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = makeStore();
    stubLocalStorage(store);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retake thumbnail button has h-10 (mobile touch target) + sm:h-7 (desktop)", async () => {
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
    const btn = await findByLabelText("Retake thumbnail for note 1");
    const cls = btn.className;
    // Mobile: 40px height (h-10). Desktop: reverts to 28px (sm:h-7).
    expect(cls).toContain("h-10");
    expect(cls).toContain("sm:h-7");
  });

  it("re-record button has h-10 (mobile touch target) + sm:h-7 (desktop)", async () => {
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
    const btn = await findByLabelText("Re-record note 1");
    const cls = btn.className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("sm:h-7");
  });

  it("delete button has h-10 (mobile touch target) + sm:h-7 (desktop)", async () => {
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
    const btn = await findByLabelText("Delete note 1");
    const cls = btn.className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("sm:h-7");
  });
});
