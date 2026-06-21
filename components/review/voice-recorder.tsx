"use client";

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { formatTimecode } from "@/lib/review/timecode";
import {
  createSegment,
  finalizeSegment,
  sortSegmentsByStartTime,
  type RecordingSegment,
} from "@/lib/review/recording";
import { createEvent, type ReviewEvent } from "@/lib/review/events";

// MediaRecorder support is a browser-only, stable external signal. Reading it
// via useSyncExternalStore avoids both hydration mismatch (server returns false)
// and the react-hooks/set-state-in-effect lint rule.
function subscribeMediaRecorderSupport() {
  return () => {};
}
function getMediaRecorderSupportSnapshot() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}
function getMediaRecorderSupportServerSnapshot() {
  return false;
}

type VoiceRecorderProps = {
  /**
   * The video's current playback time (seconds). Captured when recording
   * starts so each voiceover segment is anchored to a video timecode.
   */
  currentTime: number;
  /** Optional callback fired when a review event (record_start/record_stop) occurs. */
  onEvent?: (event: ReviewEvent) => void;
};

/**
 * Phase 5 — Microphone recording for coach voiceover.
 *
 * Uses the browser MediaRecorder API to capture the coach's microphone while
 * they review the swing video. Each recording is tied to the video timecode
 * at the moment recording started (via lib/review/recording.ts).
 *
 * MVP persistence: recorded audio lives as in-memory blob URLs. The render
 * pipeline (Phase 6) will persist these as real audio assets.
 *
 * Browser-only: MediaRecorder is not available in jsdom, so this component
 * is verified via the build, not unit tests. The segment logic it relies on
 * is unit-tested in tests/recording.test.ts.
 */
export function VoiceRecorder({ currentTime, onEvent }: VoiceRecorderProps) {
  const isSupported = useSyncExternalStore(
    subscribeMediaRecorderSupport,
    getMediaRecorderSupportSnapshot,
    getMediaRecorderSupportServerSnapshot,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<RecordingSegment[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeSegmentRef = useRef<RecordingSegment | null>(null);
  const recordStartRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const handleStop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const segment = activeSegmentRef.current;
    if (!recorder || !segment) return;

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    const audioBlobUrl = URL.createObjectURL(blob);
    const endTime = segment.startTime + (Date.now() - recordStartRef.current) / 1000;

    const finalized = finalizeSegment(segment, endTime, audioBlobUrl);
    setSegments((prev) => sortSegmentsByStartTime([...prev, finalized]));
    onEventRef.current?.(
      createEvent("record_stop", segment.startTime, {
        duration: finalized.duration,
      }),
    );

    // Reset refs
    mediaRecorderRef.current = null;
    activeSegmentRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);

    // Release the microphone stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = handleStop;

      // Anchor the segment to the current video timecode.
      activeSegmentRef.current = createSegment(currentTime);
      recordStartRef.current = Date.now();

      recorder.start();
      setIsRecording(true);
      onEventRef.current?.(createEvent("record_start", currentTime));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not access microphone";
      setError(message);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function deleteSegment(id: string) {
    setSegments((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.audioBlobUrl) {
        URL.revokeObjectURL(target.audioBlobUrl);
      }
      return prev.filter((s) => s.id !== id);
    });
  }

  // Clean up any active stream/recordings on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      segments.forEach((s) => {
        if (s.audioBlobUrl) URL.revokeObjectURL(s.audioBlobUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Voice recording is not supported in this browser. The Review Studio
        works best in Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold">Voiceover</h3>
        <span className="text-xs text-muted-foreground">
          Record narration tied to the video timecode.
        </span>
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <Button
            variant="default"
            size="sm"
            onClick={startRecording}
            aria-label="Start voiceover recording"
          >
            ● Record
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            aria-label="Stop voiceover recording"
          >
            ■ Stop
          </Button>
        )}
        {isRecording && (
          <span className="text-xs text-destructive">
            Recording from {formatTimecode(currentTime)}…
          </span>
        )}
      </div>

      {segments.length > 0 && (
        <ul className="mt-4 space-y-2">
          {segments.map((segment) => (
            <li
              key={segment.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              {segment.audioBlobUrl && (
                <audio
                  controls
                  src={segment.audioBlobUrl}
                  className="h-8 w-full max-w-xs"
                  aria-label={`Playback voiceover from ${formatTimecode(segment.startTime)}`}
                />
              )}
              <span className="font-mono text-xs text-muted-foreground">
                @ {formatTimecode(segment.startTime)} · {segment.duration.toFixed(1)}s
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSegment(segment.id)}
                aria-label="Delete voiceover segment"
                className="ml-auto"
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
