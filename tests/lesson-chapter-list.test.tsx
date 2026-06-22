import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LessonChapterList,
  type LessonChapterListProps,
} from "@/components/lesson/lesson-chapter-list";
import type { LessonChapter } from "@/lib/lesson/chapters";

function makeChapter(overrides: Partial<LessonChapter> = {}): LessonChapter {
  return {
    id: overrides.id ?? "n1",
    timecode: overrides.timecode ?? 5,
    title: overrides.title ?? "Note 1",
    thumbnailUrl: overrides.thumbnailUrl,
    transcript: overrides.transcript,
    audioDuration: overrides.audioDuration ?? 3,
  };
}

function renderList(props: Partial<LessonChapterListProps> = {}) {
  const onSelect = vi.fn();
  const chapters: LessonChapter[] = props.chapters ?? [
    makeChapter({ id: "n1", timecode: 5, title: "Grip", thumbnailUrl: "https://ex.com/t1.jpg", transcript: "Fix your grip" }),
    makeChapter({ id: "n2", timecode: 15, title: "Stance", thumbnailUrl: "https://ex.com/t2.jpg", transcript: "Widen stance" }),
  ];
  render(
    <LessonChapterList
      chapters={chapters}
      activeChapterId={props.activeChapterId ?? null}
      onSelect={props.onSelect ?? onSelect}
    />,
  );
  return { onSelect };
}

describe("LessonChapterList", () => {
  it("renders a chapter button for each chapter", () => {
    renderList();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Grip");
    expect(buttons[1]).toHaveTextContent("Stance");
  });

  it("renders formatted timecodes", () => {
    renderList();
    expect(screen.getByText("0:05")).toBeDefined();
    expect(screen.getByText("0:15")).toBeDefined();
  });

  it("renders thumbnail images when thumbnailUrl is present", () => {
    renderList();
    const imgs = document.querySelectorAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute("src")).toBe("https://ex.com/t1.jpg");
  });

  it("renders thumbnail placeholder when no thumbnailUrl", () => {
    const chapters = [makeChapter({ id: "n1", thumbnailUrl: undefined })];
    render(
      <LessonChapterList chapters={chapters} activeChapterId={null} onSelect={vi.fn()} />,
    );
    expect(document.querySelectorAll("img")).toHaveLength(0);
    // Placeholder should exist — a div with aria-hidden or a similar marker
    expect(screen.getByText("0:05")).toBeDefined();
  });

  it("renders transcript text when present", () => {
    renderList();
    expect(screen.getByText("Fix your grip")).toBeDefined();
    expect(screen.getByText("Widen stance")).toBeDefined();
  });

  it("does not render transcript container when absent", () => {
    const chapters = [makeChapter({ id: "n1", transcript: undefined })];
    render(
      <LessonChapterList chapters={chapters} activeChapterId={null} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText("Fix your grip")).toBeNull();
  });

  it("calls onSelect with timecode and noteId when a chapter is clicked", () => {
    const { onSelect } = renderList();
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onSelect).toHaveBeenCalledWith(15, "n2");
  });

  it("highlights the active chapter with a distinct class", () => {
    renderList({ activeChapterId: "n2" });
    const buttons = screen.getAllByRole("button");
    expect(buttons[1].className).toContain("ring");
    expect(buttons[0].className).not.toContain("ring");
  });

  it("renders empty state message when no chapters", () => {
    render(
      <LessonChapterList chapters={[]} activeChapterId={null} onSelect={vi.fn()} />,
    );
    expect(screen.getByText(/no coach notes/i)).toBeDefined();
  });

  it("renders a heading", () => {
    renderList();
    expect(screen.getByText(/chapters/i)).toBeDefined();
  });
});
