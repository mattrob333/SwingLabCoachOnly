import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ReviewStudioClient } from "@/components/review/review-studio-client";

// Mock browser-API-heavy child components so we can render the studio shell
// without a real <video>, MediaRecorder, or canvas context.
vi.mock("@/components/review/video-player", () => ({
  VideoPlayer: () => <div data-testid="video-player" />,
}));
vi.mock("@/components/review/voice-recorder", () => ({
  VoiceRecorder: () => <div data-testid="voice-recorder" />,
}));
// Mock AnnotationCanvas (the overlay) — the mobile toolbar is rendered
// separately by ReviewStudioClient and uses the real AnnotationToolbar.
vi.mock("@/components/review/annotation-canvas", () => ({
  AnnotationCanvas: () => <div data-testid="annotation-canvas" />,
}));

/**
 * Course correction (HIGH, 2026-06-22): On mobile (360–430px) the annotation
 * draw-tools toolbar overlapped the bottom of the <video> element, covering
 * the player's feet and the tee base.
 *
 * Fix: the toolbar is split — desktop overlay (hidden sm:flex, inside
 * AnnotationCanvas) + mobile stacked block (sm:hidden, below the video,
 * rendered by ReviewStudioClient). These tests verify the mobile layout.
 */
describe("ReviewStudioClient — annotation toolbar mobile layout", () => {
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

  it("renders a mobile toolbar below the video (sm:hidden)", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    // The mobile toolbar is a div with `sm:hidden` that contains the
    // AnnotationToolbar (tool buttons, color swatches, undo, clear).
    const mobileToolbar = container.querySelector("div.sm\\:hidden");
    expect(mobileToolbar).not.toBeNull();

    // It should contain tool buttons (Freehand, Line, Arrow, Circle).
    const freehandBtn = mobileToolbar!.querySelector('button[aria-label="Freehand"]');
    expect(freehandBtn).not.toBeNull();

    // It should contain color swatches.
    const colorSwatch = mobileToolbar!.querySelector('button[aria-label="Select #ef4444"]');
    expect(colorSwatch).not.toBeNull();

    // It should contain Undo and Clear buttons.
    expect(mobileToolbar!.querySelector('button[aria-label="Undo last annotation"]')).not.toBeNull();
    expect(mobileToolbar!.querySelector('button[aria-label="Clear annotations"]')).not.toBeNull();
  });

  it("mobile toolbar appears AFTER the video player in DOM order (below the video)", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const videoPlayer = container.querySelector('[data-testid="video-player"]');
    const mobileToolbar = container.querySelector("div.sm\\:hidden");

    expect(videoPlayer).not.toBeNull();
    expect(mobileToolbar).not.toBeNull();

    // The mobile toolbar should come after the video player in DOM order.
    const allElements = Array.from(container.querySelectorAll("*"));
    const videoIdx = allElements.indexOf(videoPlayer!);
    const toolbarIdx = allElements.indexOf(mobileToolbar!);
    expect(toolbarIdx).toBeGreaterThan(videoIdx);
  });

  it("mobile toolbar is NOT inside the video player overlay", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const videoPlayer = container.querySelector('[data-testid="video-player"]');
    const mobileToolbar = container.querySelector("div.sm\\:hidden");

    // The mobile toolbar must NOT be a descendant of the video player.
    expect(mobileToolbar!.contains(videoPlayer!)).toBe(false);
    expect(videoPlayer!.contains(mobileToolbar!)).toBe(false);
  });

  it("mobile toolbar tool buttons have h-10 touch targets", () => {
    const { container } = render(
      <ReviewStudioClient
        submissionId="sub-1"
        videoUrl="http://example.com/v.mp4"
      />,
    );

    const mobileToolbar = container.querySelector("div.sm\\:hidden");
    const freehandBtn = mobileToolbar!.querySelector('button[aria-label="Freehand"]');
    expect(freehandBtn!.className).toContain("h-10");
    expect(freehandBtn!.className).toContain("sm:h-8");
  });
});
