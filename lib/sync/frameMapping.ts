/**
 * Sync Engine — Frame Mapping (PRD §9).
 *
 * Translates a single normalized scrubber value (0.0 → 1.0) into the
 * correct frame index for a given swing's phase-tagged frames.
 *
 * The scrubber represents normalized swing *progress*, not raw time, so
 * two swings that reach contact at different clock times still line up
 * by movement stage.
 */

import {
  PHASE_NAMES,
  PHASE_POSITIONS,
  type PhaseMarkers,
  type PhaseName,
} from "./phases";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Map normalized scrubber progress to a frame index for one swing.
 *
 * Implements the PRD §9.2 pseudocode:
 *  1. Clamp progress to [0, 1].
 *  2. Find the two surrounding phase positions.
 *  3. Interpolate frame index between the two marked phase frames.
 *  4. If progress lands exactly on a phase, return that phase's frame.
 *
 * Phases without a marker are skipped (the swing interpolates between the
 * nearest marked phases on either side). This keeps the engine robust for
 * the V1 minimum (stance/load/launch/contact/finish).
 */
export function frameForProgress(
  progress: number,
  markers: PhaseMarkers,
): number {
  const p = clamp(progress, 0, 1);

  const marked = PHASE_NAMES.filter((name) => markers[name] != null).map(
    (name) => ({
      name: name as PhaseName,
      pos: PHASE_POSITIONS[name],
      frame: markers[name]!.frame,
    }),
  );

  if (marked.length === 0) {
    return 0;
  }

  if (p <= marked[0].pos) {
    return marked[0].frame;
  }

  if (p >= marked[marked.length - 1].pos) {
    return marked[marked.length - 1].frame;
  }

  for (let i = 0; i < marked.length - 1; i++) {
    const a = marked[i];
    const b = marked[i + 1];
    if (p >= a.pos && p <= b.pos) {
      const span = b.pos - a.pos;
      const local = span === 0 ? 0 : (p - a.pos) / span;
      return Math.round(a.frame + local * (b.frame - a.frame));
    }
  }

  return marked[marked.length - 1].frame;
}

/**
 * Compute the pro and player frame indexes for a single scrubber value.
 * Convenience wrapper used by the Compare screen.
 */
export function framesForProgress(
  progress: number,
  proMarkers: PhaseMarkers,
  playerMarkers: PhaseMarkers,
): { proFrame: number; playerFrame: number } {
  return {
    proFrame: frameForProgress(progress, proMarkers),
    playerFrame: frameForProgress(progress, playerMarkers),
  };
}
