"use client";

import { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/review/video-player";
import { VoiceRecorder } from "@/components/review/voice-recorder";
import { AnnotationCanvas } from "@/components/review/annotation-canvas";

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
 */
export function ReviewStudioClient({ videoUrl }: ReviewStudioClientProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  return (
    <div className="mt-6 space-y-6">
      <VideoPlayer
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        overlay={<AnnotationCanvas currentTime={currentTime} />}
      />
      <VoiceRecorder currentTime={currentTime} />
    </div>
  );
}
