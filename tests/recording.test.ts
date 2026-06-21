import { describe, it, expect } from "vitest";
import {
  createSegment,
  finalizeSegment,
  sortSegmentsByStartTime,
  type RecordingSegment,
} from "@/lib/review/recording";

describe("createSegment", () => {
  it("creates a segment with the given start time and no duration", () => {
    const segment = createSegment(5.5);
    expect(segment.startTime).toBe(5.5);
    expect(segment.duration).toBe(0);
    expect(segment.audioBlobUrl).toBeNull();
    expect(segment.id).toBeTruthy();
  });

  it("creates unique ids for multiple segments", () => {
    const a = createSegment(0);
    const b = createSegment(1);
    expect(a.id).not.toBe(b.id);
  });
});

describe("finalizeSegment", () => {
  it("finalizes a segment with duration and audio blob URL", () => {
    const segment = createSegment(10);
    const finalized = finalizeSegment(segment, 15, "blob:http://localhost/abc");
    expect(finalized.startTime).toBe(10);
    expect(finalized.duration).toBe(5);
    expect(finalized.audioBlobUrl).toBe("blob:http://localhost/abc");
  });

  it("preserves the segment id", () => {
    const segment = createSegment(0);
    const finalized = finalizeSegment(segment, 3, "blob:xyz");
    expect(finalized.id).toBe(segment.id);
  });

  it("throws if end time is before start time", () => {
    const segment = createSegment(10);
    expect(() => finalizeSegment(segment, 5, "blob:abc")).toThrow(
      "before start",
    );
  });

  it("allows zero-duration segments (edge case: instant tap)", () => {
    const segment = createSegment(5);
    const finalized = finalizeSegment(segment, 5, "blob:abc");
    expect(finalized.duration).toBe(0);
  });
});

describe("sortSegmentsByStartTime", () => {
  it("returns segments sorted ascending by startTime", () => {
    const a = createSegment(10);
    const b = createSegment(2);
    const c = createSegment(7);
    const sorted = sortSegmentsByStartTime([a, b, c]);
    expect(sorted.map((s) => s.startTime)).toEqual([2, 7, 10]);
  });

  it("does not mutate the input array", () => {
    const a = createSegment(5);
    const b = createSegment(1);
    const input = [a, b];
    sortSegmentsByStartTime(input);
    expect(input[0].startTime).toBe(5);
    expect(input[1].startTime).toBe(1);
  });

  it("returns an empty array for empty input", () => {
    expect(sortSegmentsByStartTime([])).toEqual([]);
  });
});

describe("RecordingSegment type", () => {
  it("has the expected shape", () => {
    const segment: RecordingSegment = {
      id: "test-id",
      startTime: 1.5,
      duration: 3.0,
      audioBlobUrl: "blob:test",
    };
    expect(segment.id).toBe("test-id");
    expect(segment.startTime).toBe(1.5);
    expect(segment.duration).toBe(3.0);
    expect(segment.audioBlobUrl).toBe("blob:test");
  });
});
