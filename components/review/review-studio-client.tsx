"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, FileVideo2, Mic, PlaySquare, RotateCcw, Trash2, X } from "lucide-react";
import { AnnotationCanvas, type AnnotationMark, type AnnotationCanvasHandle } from "@/components/review/annotation-canvas";
import { AnnotationToolbar, type Tool, COLORS } from "@/components/review/annotation-toolbar";
import { VideoPlayer } from "@/components/review/video-player";
import { VoiceRecorder, type VoiceRecorderHandle } from "@/components/review/voice-recorder";
import { Button } from "@/components/ui/button";
import { createReviewId } from "@/lib/review/ids";
import type { ReviewEvent } from "@/lib/review/events";
import type { RecordingSegment } from "@/lib/review/recording";
import { formatTimecode } from "@/lib/review/timecode";
import type { FreezeFrameNote, PlaybackAnnotation } from "@/lib/lesson/playback";
import { clearDraftNotes } from "@/lib/review/draft-notes";
import { useDraftNotesAutosave } from "@/components/review/use-draft-notes-autosave";
import { useBeforeUnloadWarning } from "@/components/review/use-before-unload-warning";

type ReviewStudioClientProps = {
  submissionId: string;
  videoUrl: string;
};

function annotationSummary(count: number): string {
  return `${count} annotation${count === 1 ? "" : "s"}`;
}

function drawThumbnailAnnotation(
  ctx: CanvasRenderingContext2D,
  mark: PlaybackAnnotation,
  scaleX: number,
  scaleY: number,
) {
  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];
  if (!first || !last) return;

  const point = (source: { x: number; y: number }) => ({
    x: source.x * scaleX,
    y: source.y * scaleY,
  });
  const scaledFirst = point(first);
  const scaledLast = point(last);

  ctx.strokeStyle = mark.color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "transparent";

  if (mark.tool === "circle") {
    const x = Math.min(scaledFirst.x, scaledLast.x);
    const y = Math.min(scaledFirst.y, scaledLast.y);
    const width = Math.abs(scaledLast.x - scaledFirst.x);
    const height = Math.abs(scaledLast.y - scaledFirst.y);
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (mark.tool === "pen") {
    ctx.beginPath();
    ctx.moveTo(scaledFirst.x, scaledFirst.y);
    for (const sourcePoint of mark.points.slice(1)) {
      const scaledPoint = point(sourcePoint);
      ctx.lineTo(scaledPoint.x, scaledPoint.y);
    }
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(scaledFirst.x, scaledFirst.y);
  ctx.lineTo(scaledLast.x, scaledLast.y);
  ctx.stroke();

  if (mark.tool === "arrow") {
    const angle = Math.atan2(
      scaledLast.y - scaledFirst.y,
      scaledLast.x - scaledFirst.x,
    );
    const size = 14;
    ctx.beginPath();
    ctx.moveTo(scaledLast.x, scaledLast.y);
    ctx.lineTo(
      scaledLast.x - size * Math.cos(angle - Math.PI / 6),
      scaledLast.y - size * Math.sin(angle - Math.PI / 6),
    );
    ctx.moveTo(scaledLast.x, scaledLast.y);
    ctx.lineTo(
      scaledLast.x - size * Math.cos(angle + Math.PI / 6),
      scaledLast.y - size * Math.sin(angle + Math.PI / 6),
    );
    ctx.stroke();
  }
}

function captureVideoThumbnail(
  video: HTMLVideoElement | null,
  annotations: PlaybackAnnotation[],
): string | undefined {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0) return undefined;
  try {
    const canvas = document.createElement("canvas");
    const targetWidth = 320;
    const ratio = video.videoHeight / video.videoWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(targetWidth * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    for (const annotation of annotations) {
      const sourceWidth = annotation.canvasWidth || video.clientWidth || video.videoWidth;
      const sourceHeight = annotation.canvasHeight || video.clientHeight || video.videoHeight;
      drawThumbnailAnnotation(
        ctx,
        annotation,
        canvas.width / sourceWidth,
        canvas.height / sourceHeight,
      );
    }
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

export function ReviewStudioClient({
  submissionId,
  videoUrl,
}: ReviewStudioClientProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [marks, setMarks] = useState<AnnotationMark[]>([]);
  const [segments, setSegments] = useState<RecordingSegment[]>([]);
  const [notes, setNotes] = useState<FreezeFrameNote[]>([]);
  const [reRecordNoteId, setReRecordNoteId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const [zoomedNoteId, setZoomedNoteId] = useState<string | null>(null);
  const [annotationTool, setAnnotationTool] = useState<Tool>("arrow");
  const [annotationColor, setAnnotationColor] = useState(COLORS[0]);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const voiceRecorderRef = useRef<VoiceRecorderHandle>(null);
  const annotationRef = useRef<AnnotationCanvasHandle>(null);

  // Close the thumbnail lightbox when Escape is pressed.
  useEffect(() => {
    if (zoomedNoteId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedNoteId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoomedNoteId]);

  // Wave 3 — autosave: restore draft notes on mount + debounce-save on change.
  const { savedAt: draftSavedAt } = useDraftNotesAutosave(
    submissionId,
    notes,
    setNotes,
  );

  // Wave 3 — safe recovery: warn when navigating away with unprocessed notes.
  // The autosave localStorage draft is the recovery mechanism; this hook is
  // the "are you sure you want to leave?" guard that prevents accidental
  // tab-close/navigation from interrupting the review session.
  useBeforeUnloadWarning(notes.length > 0 && !lessonUrl && !processing);

  const assignedAnnotationIds = useMemo(
    () => new Set(notes.flatMap((note) => note.annotations.map((mark) => mark.id))),
    [notes],
  );
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => a.timecode - b.timecode),
    [notes],
  );

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleEvent = useCallback((event: ReviewEvent) => {
    setEvents((prev) => [...prev, event]);
    setLessonUrl(null);
  }, []);

  const handleVideoElementReady = useCallback((video: HTMLVideoElement | null) => {
    videoElementRef.current = video;
  }, []);

  const handleSegmentFinalized = useCallback(
    (segment: RecordingSegment) => {
      const audioUrl = segment.audioBlobUrl;
      if (!audioUrl) return;

      setNotes((prev) => {
        // Re-record: replace the target note's audio in-place, keeping its
        // id, timecode, annotations, transcript, and thumbnail.
        if (reRecordNoteId) {
          return prev.map((note) =>
            note.id === reRecordNoteId
              ? { ...note, audioUrl, audioDuration: segment.duration }
              : note,
          );
        }

        // Normal: create a new note from the finalized segment.
        const alreadyAssigned = new Set([
          ...assignedAnnotationIds,
          ...prev.flatMap((note) => note.annotations.map((mark) => mark.id)),
        ]);
        const annotations = marks.filter(
          (mark) =>
            !alreadyAssigned.has(mark.id) &&
            Math.abs(mark.timecode - segment.startTime) <= 3,
        );
        const note: FreezeFrameNote = {
          id: createReviewId("note"),
          timecode: segment.startTime,
          audioUrl,
          audioDuration: segment.duration,
          thumbnailUrl: captureVideoThumbnail(videoElementRef.current, annotations),
          transcript: "",
          transcriptRaw: "",
          transcriptStatus: "pending",
          annotations,
          createdAt: Date.now(),
        };
        return [...prev, note].sort((a, b) => a.timecode - b.timecode);
      });
      setReRecordNoteId(null);
      setLessonUrl(null);
    },
    [assignedAnnotationIds, marks, reRecordNoteId],
  );

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setLessonUrl(null);
  }

  function reRecordNote(note: FreezeFrameNote) {
    // Seek the video to the note's timecode so the new recording is anchored
    // to the same frame.
    if (videoElementRef.current) {
      videoElementRef.current.currentTime = note.timecode;
    }
    setReRecordNoteId(note.id);
    voiceRecorderRef.current?.startRecording(note.timecode);
    setLessonUrl(null);
  }

  function updateNoteTranscript(id: string, transcript: string) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, transcript, transcriptEdited: transcript }
          : note,
      ),
    );
    setLessonUrl(null);
  }

  function retakeThumbnail(note: FreezeFrameNote) {
    const video = videoElementRef.current;
    if (!video || video.videoWidth === 0) return;
    video.pause();

    const capture = () => {
      const newThumb = captureVideoThumbnail(video, note.annotations);
      if (newThumb) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === note.id ? { ...n, thumbnailUrl: newThumb } : n,
          ),
        );
      }
    };

    // If already at the timecode, capture immediately. Otherwise seek first
    // and capture when the seeked event fires.
    if (Math.abs(video.currentTime - note.timecode) < 0.1) {
      capture();
    } else {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        capture();
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = note.timecode;
    }
    setLessonUrl(null);
  }

  async function processLesson() {
    setProcessing(true);
    setProcessError(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/lesson-playback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl,
          notes,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to process lesson");
      }
      setLessonUrl(`/lesson/${submissionId}`);
      // Draft is committed to the lesson manifest — clear the autosave draft.
      clearDraftNotes(submissionId);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : "Failed to process lesson");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <VideoPlayer
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onEvent={handleEvent}
        onVideoElementReady={handleVideoElementReady}
        overlay={
          <AnnotationCanvas
            ref={annotationRef}
            currentTime={currentTime}
            tool={annotationTool}
            color={annotationColor}
            onToolChange={setAnnotationTool}
            onColorChange={setAnnotationColor}
            onEvent={handleEvent}
            onMarksChange={setMarks}
          />
        }
      />

      {/* Mobile annotation toolbar — stacked below the video so it does
          NOT cover the swing frame. Hidden on sm+ where the overlay
          toolbar (inside AnnotationCanvas) is used instead. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 sm:hidden">
        <AnnotationToolbar
          tool={annotationTool}
          color={annotationColor}
          onToolChange={setAnnotationTool}
          onColorChange={setAnnotationColor}
          onUndo={() => annotationRef.current?.undo()}
          onClear={() => annotationRef.current?.clearAll()}
          canUndo={marks.length === 0}
          marksCount={marks.length}
        />
      </div>

      <VoiceRecorder
        ref={voiceRecorderRef}
        submissionId={submissionId}
        currentTime={currentTime}
        onEvent={handleEvent}
        onSegmentsChange={setSegments}
        onSegmentFinalized={handleSegmentFinalized}
        showSegmentList={false}
      />

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Mic className="h-4 w-4 text-primary" />
              Coach Notes
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Pause on a frame, draw on the swing, record your explanation, then
              move to the next frame. Each recording becomes a freeze-frame
              note in the player lesson.
            </p>
            {draftSavedAt !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Autosaved {new Date(draftSavedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Current frame
            </p>
            <p className="font-mono text-sm">{formatTimecode(currentTime)}</p>
          </div>
        </div>

        {sortedNotes.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No coach notes yet. Draw on a paused frame, record a short voice
              note, and it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedNotes.map((note, index) => (
              <article
                key={note.id}
                className="rounded-lg border border-border bg-background p-4"
              >
                <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-lg border border-border bg-muted">
                    {note.thumbnailUrl ? (
                      <button
                        type="button"
                        onClick={() => setZoomedNoteId(note.id)}
                        aria-label={`Zoom thumbnail for note ${index + 1}`}
                        className="group relative block aspect-video h-full w-full cursor-zoom-in"
                      >
                        <img
                          src={note.thumbnailUrl}
                          alt={`Frozen frame for note ${index + 1}`}
                          className="aspect-video h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex aspect-video items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        Frozen frame preview will appear on new notes.
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Note {index + 1}
                        </p>
                        <h3 className="mt-1 font-medium">
                          Freeze frame at {formatTimecode(note.timecode)}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {annotationSummary(note.annotations.length)} -{" "}
                          {note.audioDuration.toFixed(1)}s voiceover
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 sm:h-7"
                          onClick={() => retakeThumbnail(note)}
                          disabled={reRecordNoteId !== null}
                          aria-label={`Retake thumbnail for note ${index + 1}`}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 sm:h-7"
                          onClick={() => reRecordNote(note)}
                          disabled={reRecordNoteId !== null}
                          aria-label={`Re-record note ${index + 1}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-10 sm:h-7"
                          onClick={() => deleteNote(note.id)}
                          disabled={reRecordNoteId !== null}
                          aria-label={`Delete note ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <audio
                      controls
                      src={note.audioUrl}
                      className="mt-3 h-9 w-full"
                      aria-label={`Playback coach note ${index + 1}`}
                    />
                    <label className="mt-3 block text-xs font-medium text-muted-foreground">
                      Transcript / player note
                    </label>
                    <textarea
                      value={note.transcriptEdited ?? note.transcript ?? ""}
                      onChange={(event) =>
                        updateNoteTranscript(note.id, event.target.value)
                      }
                      rows={2}
                      className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Voice-to-text will populate this later. You can add or edit the note text here now."
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {
                          (note.transcriptEdited ?? note.transcript ?? "")
                            .length
                        }{" "}
                        characters
                      </span>
                      {note.transcriptEdited != null &&
                        note.transcriptEdited !==
                          (note.transcriptRaw ?? "") && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Edited
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileVideo2 className="h-4 w-4 text-primary" />
              Process Lesson
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Creates an interactive lesson: the player video pauses at each
              coach note, shows the frozen annotations, plays your voiceover,
              then resumes.
            </p>
          </div>
          <Button
            type="button"
            onClick={processLesson}
            disabled={processing || notes.length === 0}
            className="gap-2"
          >
            <PlaySquare className="h-4 w-4" />
            {processing ? "Processing..." : "Process lesson"}
          </Button>
        </div>

        {processError && (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {processError}
          </p>
        )}

        {lessonUrl && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <span className="inline-flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Interactive lesson is ready.
            </span>
            <a
              href={lessonUrl}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-green-700 px-3 text-sm font-medium text-white hover:bg-green-800"
            >
              Open player lesson
            </a>
          </div>
        )}

        <details className="mt-4 rounded-lg border border-border bg-background p-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Debug capture data
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            {events.length} raw event{events.length === 1 ? "" : "s"} -{" "}
            {marks.length} mark{marks.length === 1 ? "" : "s"} -{" "}
            {segments.length} voice segment{segments.length === 1 ? "" : "s"}
          </p>
        </details>
      </section>

      {zoomedNoteId !== null && (() => {
        const note = sortedNotes.find((n) => n.id === zoomedNoteId);
        if (!note || !note.thumbnailUrl) return null;
        const idx = sortedNotes.indexOf(note);
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Zoomed freeze frame for note ${idx + 1}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setZoomedNoteId(null)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={note.thumbnailUrl}
                alt={`Frozen frame for note ${idx + 1} (zoomed)`}
                className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={() => setZoomedNoteId(null)}
                aria-label="Close zoomed image"
                className="absolute -top-2 -right-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background text-foreground shadow-md hover:bg-muted sm:-top-3 sm:-right-3 sm:h-8 sm:w-8"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
