/**
 * Phase 5 — Timecode utilities for frame-accurate video scrubbing.
 *
 * All functions are pure and operate on seconds (float). Frame boundaries are
 * computed by rounding to the nearest frame at the given FPS, which eliminates
 * floating-point drift during repeated stepping.
 */

/** Default frame rate for swing analysis video (30 fps). */
export const FRAME_RATE = 30;

/**
 * Format a time in seconds as a timecode string.
 *
 * - Under 1 hour: `MM:SS:FF`
 * - 1 hour or more: `HH:MM:SS:FF`
 *
 * `FF` is the frame number within the current second (0–FPS-1).
 */
export function formatTimecode(
  seconds: number,
  fps: number = FRAME_RATE,
): string {
  if (seconds < 0) seconds = 0;

  const totalFrames = Math.round(seconds * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const ss = totalSeconds % 60;
  const mm = Math.floor(totalSeconds / 60) % 60;
  const hh = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hh > 0) {
    return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(frames)}`;
  }
  return `${pad(mm)}:${pad(ss)}:${pad(frames)}`;
}

/**
 * Parse a timecode string into seconds (float).
 *
 * Accepts `MM:SS:FF` (3 parts) or `HH:MM:SS:FF` (4 parts).
 */
export function parseTimecode(
  timecode: string,
  fps: number = FRAME_RATE,
): number {
  const parts = timecode.split(":").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) {
    return 0;
  }

  let hh = 0;
  let mm: number;
  let ss: number;
  let ff: number;

  if (parts.length === 4) {
    [hh, mm, ss, ff] = parts;
  } else {
    [mm, ss, ff] = parts;
  }

  return hh * 3600 + mm * 60 + ss + ff / fps;
}

/**
 * Step one frame forward or backward, snapping to exact frame boundaries.
 *
 * @param seconds   Current time in seconds.
 * @param direction `1` for forward, `-1` for backward.
 * @param duration  Optional video duration — the result is clamped to `[0, duration]`.
 * @returns         New time in seconds, snapped to a frame boundary.
 */
export function stepFrames(
  seconds: number,
  direction: 1 | -1,
  duration?: number,
  fps: number = FRAME_RATE,
): number {
  const currentFrame = Math.round(seconds * fps);
  const newFrame = Math.max(0, currentFrame + direction);
  let newTime = newFrame / fps;
  if (duration !== undefined) {
    newTime = Math.min(newTime, duration);
  }
  return newTime;
}

/**
 * Clamp a time value to `[0, duration]`.
 */
export function clampTime(time: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(time, duration));
}
