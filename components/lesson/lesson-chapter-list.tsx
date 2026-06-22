"use client";

import { LessonChapter, formatChapterTime } from "@/lib/lesson/chapters";

export type LessonChapterListProps = {
  chapters: LessonChapter[];
  activeChapterId?: string | null;
  onSelect: (timecode: number, noteId: string) => void;
};

export function LessonChapterList({
  chapters,
  activeChapterId,
  onSelect,
}: LessonChapterListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Chapters
      </h3>
      {chapters.length === 0 && (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No coach notes in this lesson.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {chapters.map((chapter) => {
          const isActive = chapter.id === activeChapterId;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => onSelect(chapter.timecode, chapter.id)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                isActive
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
              aria-current={isActive ? "true" : undefined}
            >
              {chapter.thumbnailUrl ? (
                <img
                  src={chapter.thumbnailUrl}
                  alt=""
                  className="h-12 w-20 flex-shrink-0 rounded object-cover"
                  aria-hidden="true"
                />
              ) : (
                <div className="flex h-12 w-20 flex-shrink-0 items-center justify-center rounded bg-muted" aria-hidden="true">
                  <span className="text-xs text-muted-foreground">📷</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {chapter.title}
                  </span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatChapterTime(chapter.timecode)}
                  </span>
                </div>
                {chapter.transcript && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {chapter.transcript}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
