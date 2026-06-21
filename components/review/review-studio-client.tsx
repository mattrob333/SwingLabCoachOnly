"use client";

import { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/review/video-player";
import { VoiceRecorder } from "@/components/review/voice-recorder";

type ReviewStudioClientProps = {
  /** Video URL to play. For MVP this is a sample swing video. */
  videoUrl: string;
};

/**
 * Phase 5 — Client orchestrator for the Review Studio.
 *
 * Owns the shared "current video time" state so the VoiceRecorder can anchor
 * each voiceover segment to the timecode at the moment recording starts. The
 * VideoPlayer reports time updates via the onTimeUpdate callback.
 */
export function ReviewStudioClient({ videoUrl }: ReviewStudioClientProps) {
  const [currentTime, setCurrentTime] = useState(0);

  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
  }, []);

  return (
    <div className="mt-6 space-y-6">
      <VideoPlayer src={videoUrl} onTimeUpdate={handleTimeUpdate} />
      <VoiceRecorder currentTime={currentTime} />
    </div>
  );
}
