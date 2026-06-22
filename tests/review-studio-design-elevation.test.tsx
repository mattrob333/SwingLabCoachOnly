import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ReviewStudioClient } from "@/components/review/review-studio-client";
import { draftNotesKey } from "@/lib/review/draft-notes";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

// Mock browser-API-heavy child components so the studio shell renders in jsdom.
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

describe("ReviewStudioClient — Phase 7 design elevation", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
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
    // Seed a draft so the "Process lesson" button is enabled.
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({
        notes: [makeNote()],
        savedAt: 1700000001000,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("success banner uses semantic success tokens (not hardcoded emerald)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { container, getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    fireEvent.click(getByText("Process lesson"));

    await waitFor(() => {
      expect(getByText("Interactive lesson is ready.")).toBeTruthy();
    });

    // The success banner should use bg-success, NOT emerald.
    const successBanner = container.querySelector(
      ".bg-success\\/10",
    );
    expect(successBanner).not.toBeNull();
    expect(successBanner?.className).not.toContain("emerald");

    // The "Open player lesson" link should use bg-success, not emerald.
    const openLink = getByText("Open player lesson");
    expect(openLink.className).toContain("bg-success");
    expect(openLink.className).not.toContain("emerald");
  });

  it("success link has focus-visible ring for keyboard accessibility", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as typeof global.fetch;

    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    fireEvent.click(getByText("Process lesson"));

    await waitFor(() => {
      expect(getByText("Interactive lesson is ready.")).toBeTruthy();
    });

    const openLink = getByText("Open player lesson");
    expect(openLink.className).toContain("focus-visible:ring");
  });

  it("note cards have hover lift + softer border for premium feel", async () => {
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({
        notes: [makeNote()],
        savedAt: 1700000001000,
      }),
    );

    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article?.className).toContain("hover:shadow-md");
    expect(article?.className).toContain("border-border/70");
  });

  it("note index renders as a Badge (not plain text)", async () => {
    store.set(
      draftNotesKey("sub-1"),
      JSON.stringify({
        notes: [makeNote()],
        savedAt: 1700000001000,
      }),
    );

    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const badges = container.querySelectorAll('[data-slot="badge"]');
    const noteBadge = Array.from(badges).find((b) =>
      b.textContent?.includes("Note 1"),
    );
    expect(noteBadge).not.toBeUndefined();
  });
});
