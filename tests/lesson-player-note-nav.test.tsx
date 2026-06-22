import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LessonPlaybackPlayer } from "@/components/lesson/lesson-playback-player";
import type { LessonPlaybackManifest } from "@/lib/lesson/playback";

function makeManifest(
  notes: Array<{ id: string; timecode: number }>,
): LessonPlaybackManifest {
  return {
    videoUrl: "https://example.com/video.mp4",
    notes: notes.map((n) => ({
      id: n.id,
      timecode: n.timecode,
      audioUrl: `https://example.com/${n.id}.mp3`,
      audioDuration: 3,
      annotations: [],
      createdAt: 1700000000000,
    })),
    createdAt: 1700000000000,
    status: "approved",
    version: 1,
  };
}

function activateNote(manifest: LessonPlaybackManifest, noteTitle: string) {
  render(<LessonPlaybackPlayer manifest={manifest} />);
  // Click the chapter to activate the note
  const buttons = screen.getAllByRole("button");
  const target = buttons.find((b) => b.textContent?.includes(noteTitle));
  if (!target) throw new Error(`Button for ${noteTitle} not found`);
  fireEvent.click(target);
  return buttons;
}

describe("LessonPlaybackPlayer note navigation", () => {
  it("shows a Replay button when a note is active", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5 },
      { id: "n2", timecode: 15 },
    ]);
    activateNote(manifest, "Note 1");
    expect(screen.getByText(/replay/i)).toBeDefined();
  });

  it("shows a Skip to next button when a note is active and a next note exists", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5 },
      { id: "n2", timecode: 15 },
    ]);
    activateNote(manifest, "Note 1");
    expect(screen.getByText(/next/i)).toBeDefined();
  });

  it("does not show Skip to next when on the last note", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5 },
      { id: "n2", timecode: 15 },
    ]);
    activateNote(manifest, "Note 2");
    expect(screen.queryByText(/next/i)).toBeNull();
  });

  it("clicking Skip to next activates the next note", () => {
    const manifest = makeManifest([
      { id: "n1", timecode: 5 },
      { id: "n2", timecode: 15 },
    ]);
    activateNote(manifest, "Note 1");

    // Overlay should show "0:05" (Note 1's timecode)
    expect(screen.getByText(/Coach note at/).textContent).toContain("0:05");

    // Click "Next"
    fireEvent.click(screen.getByText(/next/i));

    // Overlay should now show "0:15" (Note 2's timecode)
    expect(screen.getByText(/Coach note at/).textContent).toContain("0:15");
  });

  it("does not show replay/next buttons when no note is active", () => {
    const manifest = makeManifest([{ id: "n1", timecode: 5 }]);
    render(<LessonPlaybackPlayer manifest={manifest} />);
    expect(screen.queryByText(/replay/i)).toBeNull();
    expect(screen.queryByText(/next/i)).toBeNull();
  });
});
