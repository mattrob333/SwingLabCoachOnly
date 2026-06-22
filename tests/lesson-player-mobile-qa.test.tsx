import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LessonPlaybackPlayer } from "@/components/lesson/lesson-playback-player";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeManifest(): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: [
      { id: "n1", timecode: 5, audioUrl: "https://ex.com/a.mp3", audioDuration: 3, annotations: [], createdAt: 1700000000000 },
      { id: "n2", timecode: 15, audioUrl: "https://ex.com/b.mp3", audioDuration: 3, annotations: [], createdAt: 1700000000000 },
    ],
    createdAt: 1700000000000,
    status: "approved",
    version: 1,
  };
}

function activateFirstNote() {
  render(<LessonPlaybackPlayer manifest={makeManifest()} />);
  const buttons = screen.getAllByRole("button");
  // "Note 1" is the first chapter button (after speed controls + restart)
  const note1Button = buttons.find((b) => b.textContent?.includes("Note 1"));
  if (!note1Button) throw new Error("Note 1 button not found");
  fireEvent.click(note1Button);
}

describe("LessonPlaybackPlayer mobile QA", () => {
  it("chapter list container is scrollable with max height", () => {
    render(<LessonPlaybackPlayer manifest={makeManifest()} />);
    const scrollContainer = document.querySelector(".max-h-80.overflow-y-auto");
    expect(scrollContainer).not.toBeNull();
  });

  it("overlay replay button has touch-adequate padding", () => {
    activateFirstNote();
    const replayBtn = screen.getByText(/replay/i);
    // Should have at least py-1.5 or py-2 for touch (not py-0.5)
    expect(replayBtn.className).toMatch(/py-(1\.5|2)/);
  });

  it("overlay next button has touch-adequate padding", () => {
    activateFirstNote();
    const nextBtn = screen.getByText(/next/i);
    expect(nextBtn.className).toMatch(/py-(1\.5|2)/);
  });

  it("chapter buttons have min touch height via thumbnail/placeholder", () => {
    render(<LessonPlaybackPlayer manifest={makeManifest()} />);
    const buttons = screen.getAllByRole("button");
    const chapterButtons = buttons.filter(
      (b) => b.textContent?.includes("Note 1") || b.textContent?.includes("Note 2"),
    );
    expect(chapterButtons).toHaveLength(2);
    // Each chapter button should have p-3 padding (12px top+bottom + 48px content = ~72px)
    chapterButtons.forEach((btn) => {
      expect(btn.className).toContain("p-3");
    });
  });

  it("video has responsive max height class", () => {
    render(<LessonPlaybackPlayer manifest={makeManifest()} />);
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video!.className).toContain("max-h-");
    expect(video!.className).toContain("w-full");
  });

  it("control bar is flex-wrap for mobile", () => {
    render(<LessonPlaybackPlayer manifest={makeManifest()} />);
    const controlBar = document.querySelector(".flex.flex-wrap.items-center.justify-between");
    expect(controlBar).not.toBeNull();
  });
});
