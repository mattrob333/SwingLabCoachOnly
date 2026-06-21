/**
 * SwingLab Swing Phase Model — PRD §8.
 *
 * V1 uses a fixed 7-phase set. Each phase has an evenly-distributed
 * normalized position along the master scrubber (0.0 → 1.0).
 *
 * The sync engine compares swings by movement stage rather than by raw
 * clock time, so two hitters that reach contact at different times still
 * line up on the compare scrubber (PRD §8, §9).
 */

export const PHASE_NAMES = [
  "stance",
  "load",
  "launch",
  "turn",
  "contact",
  "extension",
  "finish",
] as const;

export type PhaseName = (typeof PHASE_NAMES)[number];

export const PHASE_SET_VERSION = "v1_default_7_phase";

/**
 * Evenly-distributed normalized phase positions (PRD §8.3).
 * stance=0.000, load=0.167, launch=0.333, turn=0.500,
 * contact=0.667, extension=0.833, finish=1.000
 */
export const PHASE_POSITIONS: Record<PhaseName, number> = {
  stance: 0.0,
  load: 1 / 6,
  launch: 2 / 6,
  turn: 3 / 6,
  contact: 4 / 6,
  extension: 5 / 6,
  finish: 1.0,
};

/** Phases that must be marked before compare is allowed (PRD §6.2.4). */
export const REQUIRED_PHASES: PhaseName[] = [
  "stance",
  "load",
  "launch",
  "contact",
  "finish",
];

/** A frame index + optional time marker assigned to a phase. */
export interface PhaseMarker {
  frame: number;
  timeMs?: number;
}

export type PhaseMarkers = Partial<Record<PhaseName, PhaseMarker>>;

/**
 * Validate that marked phases are present and increase monotonically
 * by phase order. Returns a list of human-readable problems (empty = valid).
 */
export function validatePhaseMarkers(markers: PhaseMarkers): string[] {
  const problems: string[] = [];

  for (const required of REQUIRED_PHASES) {
    if (markers[required] == null) {
      problems.push(`Missing required phase: ${required}`);
    }
  }

  const present = PHASE_NAMES.filter((p) => markers[p] != null);
  let prevFrame = -Infinity;
  for (const name of present) {
    const frame = markers[name]!.frame;
    if (frame < 0) {
      problems.push(`Phase ${name} has negative frame index ${frame}`);
    }
    if (frame < prevFrame) {
      const prevName = PHASE_NAMES[PHASE_NAMES.indexOf(name) - 1];
      problems.push(
        `Phase ${name} (frame ${frame}) is before ${prevName} (frame ${prevFrame})`,
      );
    }
    prevFrame = frame;
  }

  return problems;
}
