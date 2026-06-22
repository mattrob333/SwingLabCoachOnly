import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import * as toastModule from "@/lib/toast";
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

describe("ReviewStudioClient — process-lesson toasts (slice 7)", () => {
  let toastSpy: ReturnType<typeof vi.spyOn>;
  let store: Map<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    toastSpy = vi.spyOn(toastModule, "showToast");
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
    // Seed a draft so the "Process lesson" button is enabled (notes.length > 0).
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

  it("fires a success toast when processing the lesson succeeds", async () => {
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
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      );
    });
  });

  it("fires an error toast when the API returns non-OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Manifest save failed" }),
    }) as typeof global.fetch;

    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    fireEvent.click(getByText("Process lesson"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "error",
          description: expect.stringContaining("Manifest save failed"),
        }),
      );
    });
  });

  it("fires an error toast on network failure", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof global.fetch;

    const { getByText } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );
    fireEvent.click(getByText("Process lesson"));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "error" }),
      );
    });
  });
});
