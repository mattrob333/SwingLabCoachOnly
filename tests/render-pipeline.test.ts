import { describe, it, expect } from "vitest";
import {
  buildRenderManifest,
  serializeManifest,
  type RenderInput,
  type RenderManifest,
} from "@/lib/render/pipeline";
import type { RecordingSegment } from "@/lib/review/recording";
import type { Stroke } from "@/lib/review/strokes";
import type { ReviewEvent } from "@/lib/review/events";

function makeSegment(
  startTime: number,
  duration: number,
  audioBlobUrl = "blob:abc",
): RecordingSegment {
  return {
    id: `seg-${startTime}`,
    startTime,
    duration,
    audioBlobUrl,
  };
}

function makeStroke(timecode: number, color = "#ff0000"): Stroke {
  return {
    id: `stroke-${timecode}`,
    timecode,
    color,
    points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
  };
}

function makeEvent(
  type: ReviewEvent["type"],
  timecode: number,
): ReviewEvent {
  return {
    id: `evt-${type}-${timecode}`,
    type,
    timecode,
    payload: null,
    wallClock: 1700000000000 + timecode * 1000,
  };
}

describe("buildRenderManifest", () => {
  it("builds a manifest with video url, audio layers, annotation layers, and events", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [makeSegment(5, 10)],
      strokes: [makeStroke(7)],
      events: [makeEvent("play", 0), makeEvent("pause", 20)],
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.videoUrl).toBe("https://example.com/swing.mp4");
    expect(manifest.audioLayers).toHaveLength(1);
    expect(manifest.audioLayers[0]).toEqual({
      type: "audio",
      startTime: 5,
      duration: 10,
      source: "blob:abc",
    });
    expect(manifest.annotationLayers).toHaveLength(1);
    expect(manifest.annotationLayers[0]).toEqual({
      type: "annotation",
      timecode: 7,
      color: "#ff0000",
      pointCount: 2,
      points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
    });
    expect(manifest.events).toHaveLength(2);
    expect(manifest.events[0].type).toBe("play");
  });

  it("sorts audio layers by start time", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [makeSegment(20, 5), makeSegment(5, 10)],
      strokes: [],
      events: [],
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.audioLayers[0].startTime).toBe(5);
    expect(manifest.audioLayers[1].startTime).toBe(20);
  });

  it("sorts annotation layers by timecode", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [],
      strokes: [makeStroke(30), makeStroke(3), makeStroke(15)],
      events: [],
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.annotationLayers.map((l) => l.timecode)).toEqual([
      3, 15, 30,
    ]);
  });

  it("keeps events in their original order (wall-clock sequence)", () => {
    const events = [
      makeEvent("play", 0),
      makeEvent("pause", 10),
      makeEvent("seek", 5),
    ];
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [],
      strokes: [],
      events,
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.events.map((e) => e.type)).toEqual([
      "play",
      "pause",
      "seek",
    ]);
  });

  it("handles an empty review session (no segments, strokes, or events)", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [],
      strokes: [],
      events: [],
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.videoUrl).toBe("https://example.com/swing.mp4");
    expect(manifest.audioLayers).toEqual([]);
    expect(manifest.annotationLayers).toEqual([]);
    expect(manifest.events).toEqual([]);
  });

  it("uses the provided createdAt timestamp", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [],
      strokes: [],
      events: [],
    };

    const manifest = buildRenderManifest(input, 1700000000000);
    expect(manifest.createdAt).toBe(1700000000000);
  });

  it("defaults createdAt to the current time when omitted", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [],
      strokes: [],
      events: [],
    };

    const before = Date.now();
    const manifest = buildRenderManifest(input);
    const after = Date.now();
    expect(manifest.createdAt).toBeGreaterThanOrEqual(before);
    expect(manifest.createdAt).toBeLessThanOrEqual(after);
  });

  it("throws if videoUrl is empty", () => {
    const input: RenderInput = {
      videoUrl: "",
      segments: [],
      strokes: [],
      events: [],
    };

    expect(() => buildRenderManifest(input)).toThrow(/videoUrl/i);
  });

  it("skips segments that have not been finalized (null audioBlobUrl)", () => {
    const input: RenderInput = {
      videoUrl: "https://example.com/swing.mp4",
      segments: [
        makeSegment(5, 10),
        { ...makeSegment(15, 0), audioBlobUrl: null },
      ],
      strokes: [],
      events: [],
    };

    const manifest = buildRenderManifest(input);

    expect(manifest.audioLayers).toHaveLength(1);
    expect(manifest.audioLayers[0].startTime).toBe(5);
  });
});

describe("serializeManifest", () => {
  it("serializes a manifest to a JSON string", () => {
    const manifest: RenderManifest = {
      videoUrl: "https://example.com/swing.mp4",
      audioLayers: [
        {
          type: "audio",
          startTime: 5,
          duration: 10,
          source: "blob:abc",
        },
      ],
      annotationLayers: [
        {
          type: "annotation",
          timecode: 7,
          color: "#ff0000",
          pointCount: 2,
          points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
        },
      ],
      events: [],
      createdAt: 1700000000000,
    };

    const json = serializeManifest(manifest);
    const parsed = JSON.parse(json);

    expect(parsed.videoUrl).toBe("https://example.com/swing.mp4");
    expect(parsed.audioLayers).toHaveLength(1);
    expect(parsed.annotationLayers).toHaveLength(1);
    expect(parsed.createdAt).toBe(1700000000000);
  });

  it("produces valid JSON for an empty manifest", () => {
    const manifest: RenderManifest = {
      videoUrl: "https://example.com/swing.mp4",
      audioLayers: [],
      annotationLayers: [],
      events: [],
      createdAt: 1700000000000,
    };

    const json = serializeManifest(manifest);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
