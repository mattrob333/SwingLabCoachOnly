import { describe, it, expect } from "vitest";
import {
  PHASE_NAMES,
  PHASE_POSITIONS,
  REQUIRED_PHASES,
  validatePhaseMarkers,
  type PhaseMarkers,
} from "@/lib/sync/phases";

describe("PHASE_NAMES", () => {
  it("has the 7 V1 phases in swing order", () => {
    expect(PHASE_NAMES).toEqual([
      "stance",
      "load",
      "launch",
      "turn",
      "contact",
      "extension",
      "finish",
    ]);
  });
});

describe("PHASE_POSITIONS", () => {
  it("evenly distributes phases from 0.0 to 1.0", () => {
    expect(PHASE_POSITIONS.stance).toBe(0);
    expect(PHASE_POSITIONS.finish).toBe(1);
    expect(PHASE_POSITIONS.contact).toBeCloseTo(0.667, 2);
    const vals = PHASE_NAMES.map((p) => PHASE_POSITIONS[p]);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });
});

describe("REQUIRED_PHASES", () => {
  it("includes stance, load, launch, contact, finish", () => {
    expect(REQUIRED_PHASES).toEqual([
      "stance",
      "load",
      "launch",
      "contact",
      "finish",
    ]);
  });
});

describe("validatePhaseMarkers", () => {
  const valid: PhaseMarkers = {
    stance: { frame: 3 },
    load: { frame: 28 },
    launch: { frame: 41 },
    turn: { frame: 52 },
    contact: { frame: 66 },
    extension: { frame: 81 },
    finish: { frame: 112 },
  };

  it("returns no problems for a complete, ordered set", () => {
    expect(validatePhaseMarkers(valid)).toEqual([]);
  });

  it("flags missing required phases", () => {
    const missing = { ...valid };
    delete missing.contact;
    expect(
      validatePhaseMarkers(missing).some((p) => p.includes("contact")),
    ).toBe(true);
  });

  it("accepts the recommended minimum (required only)", () => {
    const min: PhaseMarkers = {
      stance: { frame: 3 },
      load: { frame: 28 },
      launch: { frame: 41 },
      contact: { frame: 66 },
      finish: { frame: 112 },
    };
    expect(validatePhaseMarkers(min)).toEqual([]);
  });

  it("flags non-monotonic frame order", () => {
    const bad: PhaseMarkers = { ...valid, contact: { frame: 10 } };
    expect(validatePhaseMarkers(bad).length).toBeGreaterThan(0);
  });

  it("flags negative frame index", () => {
    const bad: PhaseMarkers = { ...valid, stance: { frame: -1 } };
    expect(
      validatePhaseMarkers(bad).some((p) => p.includes("negative")),
    ).toBe(true);
  });
});
