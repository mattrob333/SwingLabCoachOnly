import { describe, it, expect } from "vitest";
import {
  createStroke,
  addPoint,
  strokeBounds,
  type Point,
} from "@/lib/review/strokes";

describe("createStroke", () => {
  it("creates an empty stroke anchored to a timecode with the given color", () => {
    const stroke = createStroke(12.5, "#ff0000");
    expect(stroke.timecode).toBe(12.5);
    expect(stroke.color).toBe("#ff0000");
    expect(stroke.points).toEqual([]);
    expect(stroke.id).toBeTruthy();
  });

  it("creates unique ids for multiple strokes", () => {
    const a = createStroke(0, "#000");
    const b = createStroke(1, "#000");
    expect(a.id).not.toBe(b.id);
  });

  it("defaults color to black when not specified", () => {
    const stroke = createStroke(0);
    expect(stroke.color).toBe("#000000");
  });
});

describe("addPoint", () => {
  it("returns a new stroke with the point appended", () => {
    const stroke = createStroke(5, "#00ff00");
    const p: Point = { x: 10, y: 20 };
    const next = addPoint(stroke, p);
    expect(next.points).toEqual([{ x: 10, y: 20 }]);
    // original unchanged (immutability)
    expect(stroke.points).toEqual([]);
  });

  it("appends multiple points in order", () => {
    let stroke = createStroke(0, "#000");
    stroke = addPoint(stroke, { x: 1, y: 1 });
    stroke = addPoint(stroke, { x: 2, y: 2 });
    stroke = addPoint(stroke, { x: 3, y: 3 });
    expect(stroke.points.map((p) => p.x)).toEqual([1, 2, 3]);
  });

  it("preserves id, timecode, and color", () => {
    const stroke = createStroke(7.5, "#abc");
    const next = addPoint(stroke, { x: 0, y: 0 });
    expect(next.id).toBe(stroke.id);
    expect(next.timecode).toBe(7.5);
    expect(next.color).toBe("#abc");
  });
});

describe("strokeBounds", () => {
  it("returns the bounding box of a stroke's points", () => {
    const stroke = createStroke(0, "#000");
    let s = addPoint(stroke, { x: 5, y: 10 });
    s = addPoint(s, { x: -3, y: 2 });
    s = addPoint(s, { x: 8, y: -1 });
    const bounds = strokeBounds(s);
    expect(bounds).toEqual({ minX: -3, minY: -1, maxX: 8, maxY: 10 });
  });

  it("returns null bounds for an empty stroke", () => {
    const stroke = createStroke(0, "#000");
    expect(strokeBounds(stroke)).toBeNull();
  });

  it("returns a zero-area box for a single-point stroke", () => {
    const stroke = addPoint(createStroke(0, "#000"), { x: 4, y: 7 });
    expect(strokeBounds(stroke)).toEqual({ minX: 4, minY: 7, maxX: 4, maxY: 7 });
  });
});
