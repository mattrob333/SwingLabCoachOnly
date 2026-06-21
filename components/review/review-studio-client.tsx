"use client";

import { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/review/video-player";
import { VoiceRecorder } from "@/components/review/voice-recorder";
import { AnnotationCanvas } from "@/components/review/annotation-canvas";
import { formatTimecode } from "@/lib/review/timecode";
import type { ReviewEvent } from "@/lib/review/events";

type ReviewStudioClientProps = {
  /** Video URL to play. For MVP this is a sample swing video. */
  videoUrl: string;
};

/**
 * Phase 5 — Client orchestrator for the Review Studio.
 *
 * Owns the shared "current video time" state so the VoiceRecorder and
 * AnnotationCanvas can anchor their output to the timecode at the moment
 * recording/drawing starts. The VideoPlayer reports time updates via the
 * onTimeUpdate callback.
 *
 * Also maintains the review event log: every play/pause/seek (from
 * VideoPlayer), record_start/record_stop (from VoiceRecorder), and stroke
 * (from AnnotationCanvas) is captured into a timeline that the render
 * pipeline (Phase 6) will consume.
 */
export function ReviewStudioClient({ videoUrl }: ReviewStudioClientProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [events, setEvents] = useState<ReviewEvent[]>([]);

  // Cap the visible log to the most recent events for perf.
  const visibleEvents = events.slice(-50);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  const handleEvent = useCallback((event: ReviewEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  return (
    <div className="mt-6 space-y-6">
      <VideoPlayer
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onEvent={handleEvent}
        overlay={
          <AnnotationCanvas currentTime={currentTime} onEvent={handleEvent} />
        }
      />
      <VoiceRecorder currentTime={currentTime} onEvent={handleEvent} />

      {/* Review event timeline */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Review Timeline</h3>
          <span className="text-xs text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"} captured
          </span>
        </div>
        {visibleEvents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Play, pause, seek, record, or draw to capture review events. The
            render pipeline will use this timeline to compose the lesson.
          </p>
        ) : (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
            {visibleEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded px-2 py-1 text-xs hover:bg-muted/50"
              >
                <span className="font-mono text-muted-foreground">
                  {formatTimecode(event.timecode)}
                </span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {event.type}
                </span>
                {event.payload && Object.keys(event.payload).length > 0 && (
                  <span className="text-muted-foreground">
                    {JSON.stringify(event.payload)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
