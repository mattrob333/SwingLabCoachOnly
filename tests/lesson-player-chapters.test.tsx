import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LessonPlaybackPlayer } from "@/components/lesson/lesson-playback-player";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeManifest(
  notes: Array<{
    id: string;
    timecode: number;
    audioUrl?: string;
    audioDuration?: number;
    thumbnailUrl?: string;
    transcript?: string;
    title?: string;
  }>,
  extras: Partial<LessonPlaybackManifest> = {},
): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: notes.map((n) => ({
      id: n.id,
      timecode: n.timecode,
      audioUrl: n.audioUrl ?? `https://example.com/${n.id}.mp3`,
      audioDuration: n.audioDuration ?? 3,
      thumbnailUrl: n.thumbnailUrl,
      transcript: n.transcript,
      annotations: [],
      createdAt: 1700000000000,
    })),
    createdAt: 1700000000000,
    status: "approved",
    version: 1,
    aiNoteTitles: notes
      .filter((n) => n.title)
      .map((n) => ({ noteId: n.id, title: n.title! })),
    ...extras,
  };
}

describe("LessonPlaybackPlayer chapter wiring", () => {
  it("renders the chapter list below the video", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5, title: "Grip" },
      { id: "n2", timecode: 15, title: "Stance" },
    ]);
    render(<LessonPlaybackPlayer manifest={manifest} />);
    expect(screen.getByText("Grip")).toBeDefined();
    expect(screen.getByText("Stance")).toBeDefined();
  });

  it("clicking a chapter activates that note and shows the overlay", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5, title: "Grip" },
      { id: "n2", timecode: 15, title: "Stance" },
    ]);
    render(<LessonPlaybackPlayer manifest={manifest} />);

    // Initially no active note overlay
    expect(screen.queryByText(/Coach note at/)).toBeNull();

    // Click "Stance" chapter
    const buttons = screen.getAllByRole("button");
    const stanceButton = buttons.find((b) => b.textContent?.includes("Stance"));
    expect(stanceButton).toBeDefined();
    fireEvent.click(stanceButton!);

    // Active note overlay should appear
    expect(screen.getByText(/Coach note at/)).toBeDefined();
    expect(screen.getByText(/Coach note at/).textContent).toContain("0:15");
  });

  it("highlights the active chapter after clicking", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5, title: "Grip" },
      { id: "n2", timecode: 15, title: "Stance" },
    ]);
    render(<LessonPlaybackPlayer manifest={manifest} />);

    const buttons = screen.getAllByRole("button");
    const stanceButton = buttons.find((b) => b.textContent?.includes("Stance"));
    fireEvent.click(stanceButton!);

    // The clicked chapter button should now have the active ring class
    expect(stanceButton!.className).toContain("ring");
  });

  it("renders transcript text in chapters when available", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5, title: "Grip", transcript: "Fix your grip pressure" },
    ]);
    render(<LessonPlaybackPlayer manifest={manifest} />);
    expect(screen.getByText("Fix your grip pressure")).toBeDefined();
  });

  it("renders thumbnails in chapters when available", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5, title: "Grip", thumbnailUrl: "https://ex.com/thumb.jpg" },
    ]);
    render(<LessonPlaybackPlayer manifest={manifest} />);
    const img = document.querySelector("img[src='https://ex.com/thumb.jpg']");
    expect(img).not.toBeNull();
  });
});
