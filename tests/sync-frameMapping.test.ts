import { describe, it, expect } from "vitest";
import { frameForProgress, framesForProgress } from "@/lib/sync/frameMapping";
import type { PhaseMarkers } from "@/lib/sync/phases";

// Pro swing with all 7 phases (PRD §12.5 sample).
const pro: PhaseMarkers = {
  stance: { frame: 0 },
  load: { frame: 22 },
  launch: { frame: 38 },
  turn: { frame: 54 },
  contact: { frame: 71 },
  extension: { frame: 88 },
  finish: { frame: 126 },
};

// Player swing with all 7 phases (PRD §12.2-12.4 sample).
const player: PhaseMarkers = {
  stance: { frame: 3 },
  load: { frame: 28 },
  launch: { frame: 41 },
  turn: { frame: 52 },
  contact: { frame: 66 },
  extension: { frame: 81 },
  finish: { frame: 112 },
};

describe("frameForProgress", () => {
  it("returns the stance frame at progress 0", () => {
    expect(frameForProgress(0, pro)).toBe(0);
    expect(frameForProgress(0, player)).toBe(3);
  });

  it("returns the finish frame at progress 1", () => {
    expect(frameForProgress(1, pro)).toBe(126);
    expect(frameForProgress(1, player)).toBe(112);
  });

  it("returns the exact marked frame when progress lands on a phase", () => {
    // contact normalized = 0.667
    expect(frameForProgress(0.667, pro)).toBe(71);
    expect(frameForProgress(0.667, player)).toBe(66);
  });

  it("interpolates between two phases for an in-between progress", () => {
    // Halfway between load (0.167, frame 22) and launch (0.333, frame 38):
    // midpoint pos = 0.25, local = 0.5 → round(22 + 0.5*(38-22)) = 30
    expect(frameForProgress(0.25, pro)).toBe(30);
  });

  it("clamps progress below 0 to the first frame", () => {
    expect(frameForProgress(-5, pro)).toBe(0);
  });

  it("clamps progress above 1 to the last frame", () => {
    expect(frameForProgress(99, pro)).toBe(126);
  });

  it("returns 0 when no phases are marked", () => {
    expect(frameForProgress(0.5, {})).toBe(0);
  });

  it("works with only the required minimum phases (5 of 7)", () => {
    const min: PhaseMarkers = {
      stance: { frame: 3 },
      load: { frame: 28 },
      launch: { frame: 41 },
      contact: { frame: 66 },
      finish: { frame: 112 },
    };
    expect(frameForProgress(0.667, min)).toBe(66);
    // between launch (0.333, 41) and contact (0.667, 66): pos 0.5, local 0.5 → 54
    expect(frameForProgress(0.5, min)).toBe(54);
  });

  it("never exceeds the max frame or drops below 0", () => {
    for (let i = 0; i <= 100; i++) {
      const f = frameForProgress(i / 100, pro);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(126);
    }
  });
});

describe("framesForProgress", () => {
  it("returns both pro and player frames for a scrubber value", () => {
    const r = framesForProgress(0.667, pro, player);
    expect(r.proFrame).toBe(71);
    expect(r.playerFrame).toBe(66);
  });

  it("at progress 0 returns both stance frames", () => {
    expect(framesForProgress(0, pro, player)).toEqual({
      proFrame: 0,
      playerFrame: 3,
    });
  });
});
