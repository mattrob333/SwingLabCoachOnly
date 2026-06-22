import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, fireEvent } from "@testing-library/react";
import { VideoPlayer } from "@/components/review/video-player";

/**
 * Wave 3 — Recovery states: VideoPlayer error handling.
 *
 * When the <video> element fires an "error" event (broken URL, unsupported
 * codec, network failure), the player should show a clear error message with
 * a Retry button instead of a blank black box with disabled controls.
 */
describe("VideoPlayer — video load error recovery (Wave 3)", () => {
  let originalError: typeof console.error;

  beforeEach(() => {
    originalError = console.error;
    // Silence React's noisy act() warnings for manually-dispatched events.
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
    vi.restoreAllMocks();
  });

  it("shows an error message when the video fires an error event", () => {
    const { container } = render(
      <VideoPlayer src="http://example.com/broken.mp4" />,
    );

    const video = container.querySelector("video")!;
    expect(video).toBeTruthy();

    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(container.textContent).toMatch(/could not be loaded/i);
  });

  it("disables playback controls when the video has errored", () => {
    const { container, getByText } = render(
      <VideoPlayer src="http://example.com/broken.mp4" />,
    );

    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    // Play button should be disabled
    const playButton = getByText("Play");
    expect(playButton).toBeDisabled();
  });

  it("clears the error and reloads when Retry is clicked", () => {
    const { container, getByText } = render(
      <VideoPlayer src="http://example.com/broken.mp4" />,
    );

    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(container.textContent).toMatch(/could not be loaded/i);

    // Mock load() so it doesn't throw in jsdom
    const loadSpy = vi.fn();
    video.load = loadSpy;

    const retryButton = getByText(/retry/i);
    act(() => {
      fireEvent.click(retryButton);
    });

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toMatch(/could not be loaded/i);
  });

  it("resets the error state when src prop changes", () => {
    const { container, rerender } = render(
      <VideoPlayer src="http://example.com/broken.mp4" />,
    );

    const video = container.querySelector("video")!;
    act(() => {
      video.dispatchEvent(new Event("error"));
    });

    expect(container.textContent).toMatch(/could not be loaded/i);

    // Re-render with a new src — error state should reset
    rerender(<VideoPlayer src="http://example.com/fixed.mp4" />);

    expect(container.textContent).not.toMatch(/could not be loaded/i);
  });
});
