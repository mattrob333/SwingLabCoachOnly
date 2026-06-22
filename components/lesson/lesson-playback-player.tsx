"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LessonChapterList } from "@/components/lesson/lesson-chapter-list";
import { buildChapterList } from "@/lib/lesson/chapters";
import type {
  FreezeFrameNote,
  LessonPlaybackManifest,
  PlaybackAnnotation,
  PlaybackPoint,
} from "@/lib/lesson/playback";

type LessonPlaybackPlayerProps = {
  manifest: LessonPlaybackManifest;
};

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function pointsToString(points: PlaybackPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function AnnotationOverlay({ note }: { note: FreezeFrameNote | null }) {
  const annotations = note?.annotations ?? [];
  const width = Math.max(
    1,
    ...annotations.map((annotation) => annotation.canvasWidth ?? 0),
  );
  const height = Math.max(
    1,
    ...annotations.map((annotation) => annotation.canvasHeight ?? 0),
  );

  if (!note || annotations.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="lesson-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="context-stroke" />
        </marker>
      </defs>
      {annotations.map((annotation) => (
        <AnnotationShape key={annotation.id} annotation={annotation} />
      ))}
    </svg>
  );
}

function AnnotationShape({ annotation }: { annotation: PlaybackAnnotation }) {
  const first = annotation.points[0];
  const last = annotation.points[annotation.points.length - 1];
  if (!first || !last) return null;

  const common = {
    stroke: annotation.color,
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  if (annotation.tool === "circle") {
    const x = Math.min(first.x, last.x);
    const y = Math.min(first.y, last.y);
    const width = Math.abs(last.x - first.x);
    const height = Math.abs(last.y - first.y);
    return (
      <ellipse
        {...common}
        cx={x + width / 2}
        cy={y + height / 2}
        rx={width / 2}
        ry={height / 2}
      />
    );
  }

  if (annotation.tool === "pen") {
    return <polyline {...common} points={pointsToString(annotation.points)} />;
  }

  return (
    <line
      {...common}
      x1={first.x}
      y1={first.y}
      x2={last.x}
      y2={last.y}
      markerEnd={annotation.tool === "arrow" ? "url(#lesson-arrowhead)" : undefined}
    />
  );
}

export function LessonPlaybackPlayer({ manifest }: LessonPlaybackPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeNote, setActiveNote] = useState<FreezeFrameNote | null>(null);
  const [handledNoteIds, setHandledNoteIds] = useState<Set<string>>(new Set());
  const [playbackRate, setPlaybackRate] = useState(0.5);
  const sortedNotes = useMemo(
    () => [...manifest.notes].sort((a, b) => a.timecode - b.timecode),
    [manifest.notes],
  );
  const chapters = useMemo(() => buildChapterList(manifest), [manifest]);

  function resetLesson() {
    const video = videoRef.current;
    if (!video) return;
    setHandledNoteIds(new Set());
    setActiveNote(null);
    video.currentTime = 0;
    video.playbackRate = playbackRate;
  }

  function jumpToChapter(timecode: number, noteId: string) {
    const video = videoRef.current;
    const note = sortedNotes.find((n) => n.id === noteId);
    if (!note) return;
    if (video) {
      video.pause();
      video.currentTime = timecode;
    }
    setActiveNote(note);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate(this: HTMLVideoElement) {
      if (activeNote) return;
      const next = sortedNotes.find(
        (note) => !handledNoteIds.has(note.id) && this.currentTime >= note.timecode,
      );
      if (!next) return;

      this.pause();
      this.currentTime = next.timecode;
      setActiveNote(next);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [activeNote, handledNoteIds, sortedNotes]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeNote) return;

    audio.src = activeNote.audioUrl;
    audio.currentTime = 0;
    void audio.play();
  }, [activeNote]);

  function onAudioEnded() {
    if (!activeNote) return;
    const resumeTime = activeNote.timecode + 0.04;
    const video = videoRef.current;
    setHandledNoteIds((prev) => new Set(prev).add(activeNote.id));
    setActiveNote(null);
    if (video) {
      if (Number.isFinite(video.duration)) {
        video.currentTime = Math.min(resumeTime, video.duration);
      }
      video.playbackRate = playbackRate;
      void video.play();
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={manifest.videoUrl}
          className="mx-auto max-h-[70vh] w-full"
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = playbackRate;
          }}
        />
        <AnnotationOverlay note={activeNote} />
        {activeNote && (
          <div className="absolute left-3 top-3 rounded-lg bg-background/90 px-3 py-2 text-sm shadow-sm backdrop-blur">
            Coach note at {formatTime(activeNote.timecode)}
          </div>
        )}
        <audio ref={audioRef} onEnded={onAudioEnded} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
        <div className="text-sm text-muted-foreground">
          {sortedNotes.length} coach note{sortedNotes.length === 1 ? "" : "s"} in this lesson.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Lesson speed
          </span>
          {[0.25, 0.5, 1].map((rate) => (
            <Button
              key={rate}
              type="button"
              variant={playbackRate === rate ? "default" : "outline"}
              size="sm"
              onClick={() => setPlaybackRate(rate)}
            >
              {rate}x
            </Button>
          ))}
          <Button type="button" variant="outline" onClick={resetLesson}>
            Restart lesson
          </Button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto border-t border-border p-4">
        <LessonChapterList
          chapters={chapters}
          activeChapterId={activeNote?.id ?? null}
          onSelect={jumpToChapter}
        />
      </div>
    </div>
  );
}
