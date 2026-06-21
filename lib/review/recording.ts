import { randomUUID } from "node:crypto";

/**
 * Phase 5 — Recording segment model for coach voiceover during review.
 *
 * A recording segment represents one continuous voice recording made by the
 * coach while watching the swing video. It is tied to a specific video
 * timestamp (when recording started) and has a duration in seconds.
 *
 * The audio blob URL is created client-side via MediaRecorder + URL.createObjectURL.
 * The render pipeline (Phase 6) will persist these as real audio assets.
 */

export type RecordingSegment = {
  /** Unique segment id. */
  id: string;
  /** Video timestamp (seconds) when recording started. */
  startTime: number;
  /** Duration of the recording in seconds. */
  duration: number;
  /** Client-side blob URL for the recorded audio, or null if not yet finalized. */
  audioBlobUrl: string | null;
};

/**
 * Create a new recording segment starting at the given video timestamp.
 * The segment is unfinalized (duration 0, no audio blob URL).
 */
export function createSegment(startTime: number): RecordingSegment {
  return {
    id: randomUUID(),
    startTime,
    duration: 0,
    audioBlobUrl: null,
  };
}

/**
 * Sort recording segments ascending by their start time.
 * Returns a new array; does not mutate the input.
 */
export function sortSegmentsByStartTime(
  segments: RecordingSegment[],
): RecordingSegment[] {
  return [...segments].sort((a, b) => a.startTime - b.startTime);
}

/**
 * Finalize a recording segment with the end time and audio blob URL.
 * Throws if the end time is before the start time.
 */
export function finalizeSegment(
  segment: RecordingSegment,
  endTime: number,
  audioBlobUrl: string,
): RecordingSegment {
  if (endTime < segment.startTime) {
    throw new Error(
      `Cannot finalize segment: end time ${endTime} before start ${segment.startTime}`,
    );
  }
  return {
    ...segment,
    duration: endTime - segment.startTime,
    audioBlobUrl,
  };
}
