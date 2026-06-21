/**
 * Phase 6 (build order #14) — Drill library (MVP).
 *
 * A small in-memory catalog of practice drills organized by swing type.
 * The AI lesson draft generator pulls from this to suggest drills for the
 * coach's lesson. The coach can add/remove/edit drills before approving.
 *
 * MVP: hardcoded list. A future version would persist these per coach.
 */

export type Drill = {
  name: string;
  description: string;
  category: string;
};

export type SwingType = "baseball" | "softball" | "golf" | "generic";

const BASEBALL_DRILLS: Drill[] = [
  {
    name: "Tee Work — Load & Stride",
    description:
      "Hit off a tee focusing on loading weight onto the back leg and striding into contact. 3 sets of 10 swings.",
    category: "Mechanics",
  },
  {
    name: "Front Toss — Timing",
    description:
      "Soft front toss from 15 feet. Focus on recognizing the pitch and timing the load. 2 sets of 15 swings.",
    category: "Timing",
  },
  {
    name: "Mirror Drill — Hand Path",
    description:
      "Slow-motion swing in front of a mirror. Check hand path, elbow position, and barrel angle at each checkpoint.",
    category: "Mechanics",
  },
  {
    name: "One-Handed Swings",
    description:
      "Swing with top hand only, then bottom hand only, off a tee. 10 reps each hand. Builds hand strength and barrel control.",
    category: "Strength",
  },
];

const SOFTBALL_DRILLS: Drill[] = [
  {
    name: "Tee Work — Hip Rotation",
    description:
      "Hit off a tee focusing on explosive hip rotation through contact. 3 sets of 10 swings.",
    category: "Mechanics",
  },
  {
    name: "Front Toss — Load Timing",
    description:
      "Soft front toss, focus on load timing and weight transfer. 2 sets of 15 swings.",
    category: "Timing",
  },
  {
    name: "Slap Contact Drill",
    description:
      "Practice slap contact off a tee — soft hands, barrel control, foot placement. 3 sets of 12 reps.",
    category: "Technique",
  },
];

const GOLF_DRILLS: Drill[] = [
  {
    name: "Slow-Mo Backswing",
    description:
      "Practice backswing in slow motion, checking club plane and shoulder turn at each checkpoint. 10 reps.",
    category: "Mechanics",
  },
  {
    name: "Impact Bag Drill",
    description:
      "Strike an impact bag focusing on forward shaft lean and weight transfer at impact. 3 sets of 10 reps.",
    category: "Impact",
  },
  {
    name: "Gate Drill — Swing Path",
    description:
      "Place two tees as a gate. Swing through without hitting the tees to promote an in-to-out path. 15 reps.",
    category: "Path",
  },
];

const GENERIC_DRILLS: Drill[] = [
  {
    name: "Slow-Motion Rehearsal",
    description:
      "Practice the swing motion in slow motion, pausing at key checkpoints. 3 sets of 10 reps.",
    category: "Mechanics",
  },
  {
    name: "Weight Transfer Drill",
    description:
      "Focus on shifting weight from back to front through the motion. 3 sets of 10 reps.",
    category: "Mechanics",
  },
  {
    name: "Balance Finish Hold",
    description:
      "Complete the swing and hold the finish position for 3 seconds. Builds balance and control. 3 sets of 10 reps.",
    category: "Balance",
  },
];

const DRILL_CATALOG: Record<SwingType, Drill[]> = {
  baseball: BASEBALL_DRILLS,
  softball: SOFTBALL_DRILLS,
  golf: GOLF_DRILLS,
  generic: GENERIC_DRILLS,
};

/**
 * Get drills for a swing type. Falls back to generic drills for unknown types.
 */
export function getDrillsForSwingType(swingType: string): Drill[] {
  const key = (swingType?.toLowerCase() ?? "") as SwingType;
  return DRILL_CATALOG[key] ?? GENERIC_DRILLS;
}
