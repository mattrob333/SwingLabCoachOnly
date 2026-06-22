import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { VideoPlayer } from "@/components/review/video-player";

/**
 * Wave 3 — Mobile responsiveness: VideoPlayer controls.
 *
 * On narrow viewports the player controls should not overflow or waste space:
 * - The keyboard-shortcut hint is irrelevant on touch devices → hidden on mobile.
 * - Frame-step buttons collapse to icon-only on mobile (no "Frame" text).
 * - The controls row wraps gracefully instead of overflowing.
 * - The dead `max-sm:mt-24` gap hack is gone (scrubber sits directly under video).
 */
describe("VideoPlayer — mobile responsive controls (Wave 3)", () => {
  let originalError: typeof console.error;

  beforeEach(() => {
    originalError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  it("hides the keyboard-shortcut hint on mobile (has `hidden` class)", () => {
    const { container } = render(<VideoPlayer src="http://example.com/clip.mp4" />);
    // The hint bar is the div that directly contains the <kbd> elements.
    const kbd = container.querySelector("kbd");
    expect(kbd).toBeTruthy();
    const hint = kbd!.parentElement;
    expect(hint).toBeTruthy();
    expect(hint!.className).toContain("hidden");
    expect(hint!.className).toContain("sm:block");
  });

  it("wraps 'Frame' labels in spans hidden on mobile", () => {
    const { container } = render(<VideoPlayer src="http://example.com/clip.mp4" />);
    const frameSpans = container.querySelectorAll("span.hidden.sm\\:inline");
    // Two frame-step buttons: "← Frame" and "Frame →"
    expect(frameSpans.length).toBeGreaterThanOrEqual(2);
    frameSpans.forEach((span) => {
      expect(span.textContent).toBe("Frame");
    });
  });

  it("controls row has flex-wrap for graceful overflow on narrow screens", () => {
    const { container } = render(<VideoPlayer src="http://example.com/clip.mp4" />);
    // The controls row contains the Play button text.
    const playButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Play" || b.textContent === "Pause",
    );
    expect(playButton).toBeTruthy();
    const controlsRow = playButton!.parentElement;
    expect(controlsRow).toBeTruthy();
    expect(controlsRow!.className).toContain("flex-wrap");
  });

  it("scrubber bar does not have the dead max-sm:mt-24 gap hack", () => {
    const { container } = render(<VideoPlayer src="http://example.com/clip.mp4" />);
    const scrubber = container.querySelector("input[type=range]")!;
    expect(scrubber).toBeTruthy();
    const scrubberBar = scrubber.parentElement;
    expect(scrubberBar).toBeTruthy();
    expect(scrubberBar!.className).not.toContain("max-sm:mt-24");
  });
});
