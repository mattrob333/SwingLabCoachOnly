import { createReviewId } from "@/lib/review/ids";

/**
 * Phase 5 — Review event capture model.
 *
 * A review event represents one discrete action the coach took during a review
 * session: playing, pausing, seeking, starting/stopping a voiceover recording,
 * or drawing an annotation stroke. Events are anchored to the video timecode
 * and carry a wall-clock timestamp so the render pipeline (Phase 6) can
 * reconstruct the full review timeline.
 *
 * The pure helpers here are unit-tested; the browser components that emit
 * events (VideoPlayer, VoiceRecorder, AnnotationCanvas) are verified via build.
 */

export type ReviewEventType =
  | "play"
  | "pause"
  | "seek"
  | "record_start"
  | "record_stop"
  | "stroke";

export type ReviewEvent = {
  /** Unique event id. */
  id: string;
  /** The kind of review action. */
  type: ReviewEventType;
  /** Video timestamp (seconds) at which the action occurred. */
  timecode: number;
  /** Optional structured data about the action (e.g. seek from/to). */
  payload: Record<string, unknown> | null;
  /** Wall-clock timestamp (ms epoch) when the event was captured. */
  wallClock: number;
};

/**
 * Create a review event. `payload` defaults to null when omitted.
 */
export function createEvent(
  type: ReviewEventType,
  timecode: number,
  payload?: Record<string, unknown> | null,
  wallClock: number = Date.now(),
): ReviewEvent {
  return {
    id: createReviewId("evt"),
    type,
    timecode,
    payload: payload ?? null,
    wallClock,
  };
}

/**
 * Serialize an array of review events to a JSON string.
 * Used to persist the event log for the render pipeline.
 */
export function serializeEvents(events: ReviewEvent[]): string {
  return JSON.stringify(events);
}
