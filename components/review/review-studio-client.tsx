"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileVideo2, Mic, PlaySquare, Trash2 } from "lucide-react";
import { AnnotationCanvas, type AnnotationMark } from "@/components/review/annotation-canvas";
import { VideoPlayer } from "@/components/review/video-player";
import { VoiceRecorder } from "@/components/review/voice-recorder";
import { Button } from "@/components/ui/button";
import { createReviewId } from "@/lib/review/ids";
import type { ReviewEvent } from "@/lib/review/events";
import type { RecordingSegment } from "@/lib/review/recording";
import { formatTimecode } from "@/lib/review/timecode";
import type { FreezeFrameNote } from "@/lib/lesson/playback";

type ReviewStudioClientProps = {
  submissionId: string;
  videoUrl: string;
};

function annotationSummary(count: number): string {
  return `${count} annotation${count === 1 ? "" : "s"}`;
}

function drawThumbnailAnnotation(
  ctx: CanvasRenderingContext2D,
  mark: AnnotationMark,
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
  annotations: AnnotationMark[],
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
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

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
          annotations,
          createdAt: Date.now(),
        };
        return [...prev, note].sort((a, b) => a.timecode - b.timecode);
      });
      setLessonUrl(null);
    },
    [assignedAnnotationIds, marks],
  );

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
    setLessonUrl(null);
  }

  function updateNoteTranscript(id: string, transcript: string) {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, transcript } : note)),
    );
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
            currentTime={currentTime}
            onEvent={handleEvent}
            onMarksChange={setMarks}
          />
        }
      />

      <VoiceRecorder
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
                      <img
                        src={note.thumbnailUrl}
                        alt={`Frozen frame for note ${index + 1}`}
                        className="aspect-video h-full w-full object-cover"
                      />
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        aria-label={`Delete note ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                      value={note.transcript ?? ""}
                      onChange={(event) =>
                        updateNoteTranscript(note.id, event.target.value)
                      }
                      rows={2}
                      className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Voice-to-text will populate this later. You can add or edit the note text here now."
                    />
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
    </div>
  );
}
