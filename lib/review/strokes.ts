import { randomUUID } from "node:crypto";

/**
 * Phase 5 — Stroke model for the annotation canvas overlay.
 *
 * A stroke represents one continuous freehand drawing made by the coach while
 * reviewing the swing video. It is anchored to the video timecode at the
 * moment drawing started and stores an ordered list of points in canvas
 * coordinate space.
 *
 * The annotation canvas component (browser-only) renders these strokes; the
 * pure helpers here are unit-tested independently.
 */

export type Point = { x: number; y: number };

export type Stroke = {
  /** Unique stroke id. */
  id: string;
  /** Video timestamp (seconds) when the stroke was started. */
  timecode: number;
  /** Stroke color (hex). */
  color: string;
  /** Ordered list of canvas points. */
  points: Point[];
};

export type StrokeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Create a new empty stroke anchored to the given video timecode.
 */
export function createStroke(timecode: number, color = "#000000"): Stroke {
  return {
    id: randomUUID(),
    timecode,
    color,
    points: [],
  };
}

/**
 * Return a new stroke with the point appended. Does not mutate the input.
 */
export function addPoint(stroke: Stroke, point: Point): Stroke {
  return { ...stroke, points: [...stroke.points, point] };
}

/**
 * Compute the axis-aligned bounding box of a stroke's points.
 * Returns null if the stroke has no points.
 */
export function strokeBounds(stroke: Stroke): StrokeBounds | null {
  if (stroke.points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}
