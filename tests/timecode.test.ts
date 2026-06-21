import { describe, it, expect } from "vitest";
import {
  formatTimecode,
  parseTimecode,
  stepFrames,
  clampTime,
  FRAME_RATE,
} from "@/lib/review/timecode";

describe("formatTimecode", () => {
  it("formats zero as 00:00:00", () => {
    expect(formatTimecode(0)).toBe("00:00:00");
  });

  it("formats seconds correctly at 30fps", () => {
    expect(formatTimecode(5)).toBe("00:05:00");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimecode(65)).toBe("01:05:00");
  });

  it("includes frame number for fractional seconds", () => {
    // 1.5 seconds at 30fps = frame 15
    expect(formatTimecode(1.5)).toBe("00:01:15");
  });

  it("rolls over frames to next second", () => {
    // 1.9666... seconds = 1 second + 29 frames (at 30fps)
    expect(formatTimecode(1 + 29 / 30)).toBe("00:01:29");
  });

  it("formats a full timestamp with hours", () => {
    // 3661.5 seconds = 1:01:01:15
    expect(formatTimecode(3661.5)).toBe("01:01:01:15");
  });

  it("handles negative input by clamping to zero", () => {
    expect(formatTimecode(-5)).toBe("00:00:00");
  });
});

describe("parseTimecode", () => {
  it("parses 00:00:00 to 0", () => {
    expect(parseTimecode("00:00:00")).toBe(0);
  });

  it("parses MM:SS:FF correctly", () => {
    expect(parseTimecode("00:05:00")).toBe(5);
  });

  it("parses with frames", () => {
    expect(parseTimecode("00:01:15")).toBeCloseTo(1.5, 5);
  });

  it("parses with hours", () => {
    expect(parseTimecode("01:01:01:15")).toBeCloseTo(3661.5, 5);
  });
});

describe("stepFrames", () => {
  it("steps forward one frame", () => {
    const oneFrame = 1 / FRAME_RATE;
    expect(stepFrames(5, 1)).toBeCloseTo(5 + oneFrame, 5);
  });

  it("steps backward one frame", () => {
    const oneFrame = 1 / FRAME_RATE;
    expect(stepFrames(5, -1)).toBeCloseTo(5 - oneFrame, 5);
  });

  it("does not go below zero", () => {
    expect(stepFrames(0, -1)).toBe(0);
  });

  it("does not exceed duration when provided", () => {
    expect(stepFrames(10, 1, 10)).toBe(10);
  });

  it("snaps to exact frame boundaries to avoid floating-point drift", () => {
    // Step forward 30 times from 0 — should land exactly on 1 second
    let t = 0;
    for (let i = 0; i < 30; i++) {
      t = stepFrames(t, 1);
    }
    expect(t).toBeCloseTo(1, 5);
  });
});

describe("clampTime", () => {
  it("clamps negative values to 0", () => {
    expect(clampTime(-5, 10)).toBe(0);
  });

  it("clamps values above duration to duration", () => {
    expect(clampTime(15, 10)).toBe(10);
  });

  it("passes through values within range", () => {
    expect(clampTime(5, 10)).toBe(5);
  });

  it("handles zero duration", () => {
    expect(clampTime(0, 0)).toBe(0);
  });
});
