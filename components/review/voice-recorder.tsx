"use client";

import { useRef, useState, useEffect, useCallback, useSyncExternalStore, forwardRef, useImperativeHandle } from "react";
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
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof window.MediaRecorder !== "undefined"
  );
}
function getMediaRecorderSupportServerSnapshot() {
  return false;
}

export type VoiceRecorderHandle = {
  /**
   * Start recording. If `timecode` is provided, the segment is anchored to
   * that video timecode (used by the re-record flow). Otherwise falls back
   * to the current playback time.
   */
  startRecording: (timecode?: number) => void;
  stopRecording: () => void;
};

type VoiceRecorderProps = {
  /**
   * The video's current playback time (seconds). Captured when recording
   * starts so each voiceover segment is anchored to a video timecode.
   */
  currentTime: number;
  submissionId: string;
  /** Optional callback fired when a review event (record_start/record_stop) occurs. */
  onEvent?: (event: ReviewEvent) => void;
  onSegmentsChange?: (segments: RecordingSegment[]) => void;
  onSegmentFinalized?: (segment: RecordingSegment) => void;
  showSegmentList?: boolean;
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
export const VoiceRecorder = forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(
  function VoiceRecorder({
    currentTime,
    submissionId,
    onEvent,
    onSegmentsChange,
    onSegmentFinalized,
    showSegmentList = true,
  }: VoiceRecorderProps, ref) {
  const isSupported = useSyncExternalStore(
    subscribeMediaRecorderSupport,
    getMediaRecorderSupportSnapshot,
    getMediaRecorderSupportServerSnapshot,
  );
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<RecordingSegment[]>([]);
  const segmentsRef = useRef<RecordingSegment[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeSegmentRef = useRef<RecordingSegment | null>(null);
  const recordStartRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const onEventRef = useRef(onEvent);
  const onSegmentsChangeRef = useRef(onSegmentsChange);
  const onSegmentFinalizedRef = useRef(onSegmentFinalized);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onSegmentsChangeRef.current = onSegmentsChange;
  }, [onSegmentsChange]);
  useEffect(() => {
    onSegmentFinalizedRef.current = onSegmentFinalized;
  }, [onSegmentFinalized]);
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Expose imperative start/stop so the parent can trigger re-recording at a
  // specific timecode. The handle is recreated when currentTime changes to
  // avoid a stale closure on the fallback path (no explicit timecode passed).
  useImperativeHandle(ref, () => ({
    startRecording: (timecode?: number) => { void startRecording(timecode); },
    stopRecording: () => stopRecording(),
    // handle intentionally recreated on currentTime change to capture the latest
    // startRecording closure (it reads currentTime via fallback). Adding
    // startRecording to deps would recreate the handle every render; currentTime
    // is the stable signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentTime]);

  async function uploadAudio(blob: Blob, mimeType: string): Promise<string> {
    const extension = mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("mp4") || mimeType.includes("m4a")
        ? "m4a"
        : "webm";
    const formData = new FormData();
    formData.set("audio", blob, `voice-note.${extension}`);

    const res = await fetch(`/api/submissions/${submissionId}/audio`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Failed to save voice note");
    }
    const data = (await res.json()) as { audioUrl: string };
    return data.audioUrl;
  }

  const handleStop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const segment = activeSegmentRef.current;
    if (!recorder || !segment) return;

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    const endTime = segment.startTime + (Date.now() - recordStartRef.current) / 1000;

    try {
      const audioUrl = await uploadAudio(blob, recorder.mimeType);
      const finalized = finalizeSegment(segment, endTime, audioUrl);
      const nextSegments = sortSegmentsByStartTime([
        ...segmentsRef.current,
        finalized,
      ]);
      segmentsRef.current = nextSegments;
      setSegments(nextSegments);
      onSegmentsChangeRef.current?.(nextSegments);
      onSegmentFinalizedRef.current?.(finalized);
      onEventRef.current?.(
        createEvent("record_stop", segment.startTime, {
          duration: finalized.duration,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save voice note");
    }

    // Reset refs
    mediaRecorderRef.current = null;
    activeSegmentRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);

    // Release the microphone stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    // uploadAudio is a component-local function; including it would recreate
    // the callback every render. submissionId is the stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  async function startRecording(forcedTime?: number) {
    const time = forcedTime ?? currentTime;
    setError(null);
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
        setError("Microphone capture is not available in this browser.");
        return;
      }

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

      // Anchor the segment to the video timecode.
      activeSegmentRef.current = createSegment(time);
      recordStartRef.current = Date.now();

      recorder.start();
      setIsRecording(true);
      onEventRef.current?.(createEvent("record_start", time));
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
    const target = segmentsRef.current.find((s) => s.id === id);
    if (target?.audioBlobUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(target.audioBlobUrl);
    }
    const nextSegments = segmentsRef.current.filter((s) => s.id !== id);
    segmentsRef.current = nextSegments;
    setSegments(nextSegments);
    onSegmentsChangeRef.current?.(nextSegments);
  }

  // Clean up any active stream/recordings on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      segmentsRef.current.forEach((s) => {
        if (s.audioBlobUrl?.startsWith("blob:")) URL.revokeObjectURL(s.audioBlobUrl);
      });
    };
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
            onClick={() => startRecording()}
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

      {showSegmentList && segments.length > 0 && (
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
  },
);
