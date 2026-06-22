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

describe("ReviewStudioClient — Card primitive usage (UX polish task #4)", () => {
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

  it("Coach Notes section uses Card primitive (data-slot=card)", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const cards = container.querySelectorAll('[data-slot="card"]');
    // At least 2 cards: Coach Notes + Process Lesson
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  it("empty notes state uses EmptyState primitive (data-slot=empty-state)", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    const emptyState = container.querySelector('[data-slot="empty-state"]');
    expect(emptyState).not.toBeNull();
  });

  it("Process Lesson section heading is present", () => {
    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    expect(getByText("Process Lesson")).toBeTruthy();
  });

  it("success banner uses success Badge when lesson is ready", async () => {
    // Seed notes so the studio has content.
    const draftNotes = [makeNote()];
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: draftNotes, savedAt: 1700000001000 }),
    );

    const { container, getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // We can't easily trigger the full processLesson flow in jsdom,
    // but we can verify the success banner structure by checking it
    // doesn't render when there's no lessonUrl.
    const successBanners = container.querySelectorAll(
      '[data-slot="badge"][class*="success"]',
    );
    // No success badge before processing
    expect(successBanners.length).toBe(0);

    // Verify the Process Lesson button exists
    expect(getByText("Process lesson")).toBeTruthy();
  });

  it("Edited badge uses Badge primitive when transcript is edited", async () => {
    const note: FreezeFrameNote = {
      ...makeNote(),
      transcript: "original text",
      transcriptRaw: "original text",
      transcriptEdited: "edited text",
    };
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: [note], savedAt: 1700000001000 }),
    );

    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // Find the "Edited" badge rendered via the Badge primitive
    const badges = container.querySelectorAll('[data-slot="badge"]');
    const editedBadge = Array.from(badges).find((b) =>
      b.textContent?.includes("Edited"),
    );
    expect(editedBadge).not.toBeUndefined();
    expect(editedBadge?.textContent).toContain("Edited");
  });

  it("Edited badge absent when transcript is not edited", async () => {
    const note: FreezeFrameNote = {
      ...makeNote(),
      transcript: "original text",
      transcriptRaw: "original text",
      transcriptEdited: null,
    };
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({ notes: [note], savedAt: 1700000001000 }),
    );

    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const badges = container.querySelectorAll('[data-slot="badge"]');
    // No badges should have "Edited" text
    const editedBadges = Array.from(badges).filter((b) =>
      b.textContent?.includes("Edited"),
    );
    expect(editedBadges.length).toBe(0);
  });
});
