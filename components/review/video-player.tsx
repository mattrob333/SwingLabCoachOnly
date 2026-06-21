"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  formatTimecode,
  stepFrames,
  clampTime,
  FRAME_RATE,
} from "@/lib/review/timecode";
import { createEvent, type ReviewEvent } from "@/lib/review/events";

type VideoPlayerProps = {
  /** Video URL to play. For MVP this is a sample swing video. */
  src: string;
  /** Optional callback fired on each timeupdate with the current playback time. */
  onTimeUpdate?: (currentTime: number) => void;
  /** Optional content rendered as an absolute overlay on top of the video frame. */
  overlay?: React.ReactNode;
  /** Optional callback fired when a review event (play/pause/seek) occurs. */
  onEvent?: (event: ReviewEvent) => void;
};

/**
 * Phase 5 — Web Review Studio video player with frame-accurate scrubber.
 *
 * Features:
 * - Play / pause
 * - Frame-step forward / backward (← → arrow keys also work)
 * - Click-to-seek timeline scrubber
 * - Timecode display (current / total) in MM:SS:FF format
 *
 * The player is the foundation for the Review Studio: annotation canvas,
 * microphone recording, and review event capture will layer on top of it.
 */
export function VideoPlayer({ src, onTimeUpdate, overlay, onEvent }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Keep latest onTimeUpdate in a ref so the listener binding (set up once)
  // always calls the freshest callback without re-subscribing.
  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Same ref pattern for onEvent.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Sync state from the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate(this: HTMLVideoElement) {
      const t = this.currentTime;
      setCurrentTime(t);
      onTimeUpdateRef.current?.(t);
    }
    function onLoadedMetadata(this: HTMLVideoElement) {
      setDuration(this.duration);
      setIsLoaded(true);
    }
    function onPlay(this: HTMLVideoElement) {
      setIsPlaying(true);
      onEventRef.current?.(createEvent("play", this.currentTime));
    }
    function onPause(this: HTMLVideoElement) {
      setIsPlaying(false);
      onEventRef.current?.(createEvent("pause", this.currentTime));
    }
    function onEnded() {
      setIsPlaying(false);
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, [isLoaded]);

  const stepForward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const from = video.currentTime;
    const newTime = stepFrames(from, 1, duration);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onEventRef.current?.(createEvent("seek", newTime, { from, to: newTime }));
  }, [duration]);

  const stepBackward = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const from = video.currentTime;
    const newTime = stepFrames(from, -1, duration);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onEventRef.current?.(createEvent("seek", newTime, { from, to: newTime }));
  }, [duration]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBackward();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, stepForward, stepBackward]);

  function handleScrubberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const from = video.currentTime;
    const newTime = clampTime(Number(e.target.value), duration);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onEventRef.current?.(createEvent("seek", newTime, { from, to: newTime }));
  }

  function handleScrubberClick(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const from = video.currentTime;
    const newTime = clampTime(ratio * duration, duration);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    onEventRef.current?.(createEvent("seek", newTime, { from, to: newTime }));
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Video */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={src}
          className="mx-auto max-h-[60vh] w-full"
          playsInline
          preload="metadata"
        />
        {overlay && (
          <div className="pointer-events-none absolute inset-0">
            {overlay}
          </div>
        )}
      </div>

      {/* Scrubber bar (click-to-seek) */}
      <div
        className="group relative h-8 cursor-pointer select-none px-4 pt-2"
        onClick={handleScrubberClick}
      >
        <div className="relative h-1.5 w-full rounded-full bg-muted">
          <div
            className="absolute h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background opacity-0 transition group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>
        {/* Hidden range input for accessibility */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={1 / FRAME_RATE}
          value={currentTime}
          onChange={handleScrubberChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Seek"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={stepBackward}
          disabled={!isLoaded}
          aria-label="Step back one frame"
        >
          ← Frame
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={togglePlay}
          disabled={!isLoaded}
        >
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={stepForward}
          disabled={!isLoaded}
          aria-label="Step forward one frame"
        >
          Frame →
        </Button>
        <div className="ml-auto font-mono text-sm text-muted-foreground">
          <span className="text-foreground">
            {formatTimecode(currentTime)}
          </span>
          {" / "}
          {formatTimecode(duration)}
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded bg-muted px-1">Space</kbd> play/pause ·{" "}
        <kbd className="rounded bg-muted px-1">←</kbd>{" "}
        <kbd className="rounded bg-muted px-1">→</kbd> step frames
      </div>
    </div>
  );
}
