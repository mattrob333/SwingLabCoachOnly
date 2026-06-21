"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

type ComparisonViewerProps = {
  originalUrl: string;
  followUpUrl: string;
  originalDate: string;
  followUpDate: string;
};

/**
 * Phase 10 — Side-by-side comparison viewer (PRD §31 build order #20).
 *
 * Renders the original and follow-up lesson videos next to each other with a
 * shared play/pause control so the coach can watch both in sync and assess
 * a player's progress. Each video also retains its native controls for
 * independent seeking.
 *
 * Web-first: plain `<video>` elements, no native dependencies.
 */
export function ComparisonViewer({
  originalUrl,
  followUpUrl,
  originalDate,
  followUpDate,
}: ComparisonViewerProps) {
  const originalRef = useRef<HTMLVideoElement>(null);
  const followUpRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    const a = originalRef.current;
    const b = followUpRef.current;
    if (!a || !b) return;

    if (a.paused || b.paused) {
      void a.play().catch(() => {});
      void b.play().catch(() => {});
      setIsPlaying(true);
    } else {
      a.pause();
      b.pause();
      setIsPlaying(false);
    }
  }, []);

  const resync = useCallback(() => {
    // Snap the follow-up's time to the original's (original is the reference).
    const a = originalRef.current;
    const b = followUpRef.current;
    if (!a || !b) return;
    b.currentTime = a.currentTime;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={togglePlay}>
          {isPlaying ? "⏸ Pause both" : "▶ Play both"}
        </Button>
        <Button variant="outline" onClick={resync}>
          ⟲ Sync follow-up to original
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ComparisonPanel
          label="Original swing"
          date={originalDate}
          url={originalUrl}
          videoRef={originalRef}
          accent="border-blue-200"
        />
        <ComparisonPanel
          label="Follow-up swing"
          date={followUpDate}
          url={followUpUrl}
          videoRef={followUpRef}
          accent="border-green-200"
        />
      </div>
    </div>
  );
}

function ComparisonPanel({
  label,
  date,
  url,
  videoRef,
  accent,
}: {
  label: string;
  date: string;
  url: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  accent: string;
}) {
  return (
    <div className={`rounded-lg border-2 ${accent} bg-card p-4`}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString()}
        </span>
      </div>
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        className="aspect-video w-full rounded-md bg-black"
      />
    </div>
  );
}
