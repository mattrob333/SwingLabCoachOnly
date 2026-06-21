import { describe, it, expect } from "vitest";
import {
  createSegment,
  finalizeSegment,
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
