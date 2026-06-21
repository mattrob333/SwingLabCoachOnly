import type { RecordingSegment } from "@/lib/review/recording";
import type { Stroke } from "@/lib/review/strokes";
import type { ReviewEvent } from "@/lib/review/events";

/**
 * Phase 6 — Render pipeline manifest composition.
 *
 * The render pipeline takes the coach's complete review session — the original
 * swing video, the coach's voiceover recording segments, the annotation
 * strokes drawn on the canvas, and the full event log — and composes them into
 * a `RenderManifest`. The manifest is an ordered description of how the final
 * lesson video should be assembled.
 *
 * MVP scope: the manifest IS the deliverable. Actual server-side video
 * compositing (ffmpeg etc.) is out of MVP scope; a future render worker
 * consumes this manifest to produce the final MP4.
 *
 * Guardrail: this is a pure function. No I/O, no side effects. Fully unit-testable.
 */

/** One audio layer in the render manifest — a single voiceover segment. */
export type AudioLayer = {
  type: "audio";
  /** Video timestamp (seconds) when this segment's audio begins. */
  startTime: number;
  /** Duration of the audio segment in seconds. */
  duration: number;
  /** Source URL for the audio asset (blob URL in MVP, persisted URL later). */
  source: string;
};

/** One annotation layer in the render manifest — a single stroke. */
export type AnnotationLayer = {
  type: "annotation";
  /** Video timestamp (seconds) when the stroke was drawn. */
  timecode: number;
  /** Stroke color (hex). */
  color: string;
  /** Number of points in the stroke. */
  pointCount: number;
  /** The ordered canvas points. */
  points: { x: number; y: number }[];
};

/** The complete render manifest — an ordered composition plan for the lesson video. */
export type RenderManifest = {
  videoUrl: string;
  audioLayers: AudioLayer[];
  annotationLayers: AnnotationLayer[];
  events: ReviewEvent[];
  createdAt: number;
};

/** Input to `buildRenderManifest`. */
export type RenderInput = {
  videoUrl: string;
  segments: RecordingSegment[];
  strokes: Stroke[];
  events: ReviewEvent[];
};

/**
 * Build a render manifest from a review session.
 *
 * - Audio layers are derived from finalized recording segments, sorted by start time.
 * - Annotation layers are derived from strokes, sorted by timecode.
 * - Events are preserved in their original (wall-clock) order.
 *
 * Throws if `videoUrl` is empty.
 */
export function buildRenderManifest(
  input: RenderInput,
  createdAt: number = Date.now(),
): RenderManifest {
  if (!input.videoUrl || input.videoUrl.trim().length === 0) {
    throw new Error("videoUrl is required to build a render manifest");
  }

  const audioLayers: AudioLayer[] = input.segments
    .filter((s) => s.audioBlobUrl !== null && s.duration > 0)
    .map((s) => ({
      type: "audio" as const,
      startTime: s.startTime,
      duration: s.duration,
      source: s.audioBlobUrl as string,
    }))
    .sort((a, b) => a.startTime - b.startTime);

  const annotationLayers: AnnotationLayer[] = [...input.strokes]
    .sort((a, b) => a.timecode - b.timecode)
    .map((s) => ({
      type: "annotation" as const,
      timecode: s.timecode,
      color: s.color,
      pointCount: s.points.length,
      points: s.points,
    }));

  return {
    videoUrl: input.videoUrl,
    audioLayers,
    annotationLayers,
    events: input.events,
    createdAt,
  };
}

/**
 * Serialize a render manifest to a JSON string for persistence.
 */
export function serializeManifest(manifest: RenderManifest): string {
  return JSON.stringify(manifest);
}
