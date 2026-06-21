"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  createStroke,
  addPoint,
  type Stroke,
  type Point,
} from "@/lib/review/strokes";
import { createEvent, type ReviewEvent } from "@/lib/review/events";

type AnnotationCanvasProps = {
  /**
   * The video's current playback time (seconds). Captured when a stroke begins
   * so each annotation is anchored to a video timecode.
   */
  currentTime: number;
  /** Optional callback fired when a review event (stroke) occurs. */
  onEvent?: (event: ReviewEvent) => void;
};

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff"];

/**
 * Phase 5 — Annotation canvas overlay for the Review Studio.
 *
 * Renders a transparent `<canvas>` absolutely positioned over the video frame.
 * The coach draws freehand with a pen tool; each stroke is anchored to the
 * video timecode at the moment drawing started (via lib/review/strokes.ts).
 *
 * Tools: color picker, undo, clear. Strokes live in component state for MVP;
 * the render pipeline (Phase 6) will persist them.
 *
 * Browser-only: Canvas drawing is not available in jsdom, so this component is
 * verified via the build. The stroke model it relies on is unit-tested in
 * tests/strokes.test.ts.
 */
export function AnnotationCanvas({ currentTime, onEvent }: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Refs mirror the latest values so event handlers and the resize observer
  // (set up once) always read fresh state without re-subscribing.
  const activeStrokeRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const colorRef = useRef(color);
  const currentTimeRef = useRef(currentTime);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.points.length < 1) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }

  function redrawAll() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesRef.current) {
      drawStroke(ctx, s);
    }
    if (activeStrokeRef.current) {
      drawStroke(ctx, activeStrokeRef.current);
    }
  }

  // Keep a ref to the latest redrawAll so the resize observer (set up once)
  // can invoke it without capturing a stale closure.
  const redrawRef = useRef(redrawAll);
  useEffect(() => {
    redrawRef.current = redrawAll;
  });

  // Size the canvas to its rendered container and keep it in sync on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      redrawRef.current();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Redraw whenever committed strokes change (undo / clear).
  useEffect(() => {
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    activeStrokeRef.current = addPoint(
      createStroke(currentTimeRef.current, colorRef.current),
      point,
    );
    setIsDrawing(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !activeStrokeRef.current) return;
    const point = getPoint(e);
    activeStrokeRef.current = addPoint(activeStrokeRef.current, point);
    redrawAll();
  }

  function onPointerUp() {
    if (!isDrawing || !activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setIsDrawing(false);
    if (finished.points.length > 0) {
      setStrokes((prev) => [...prev, finished]);
      onEventRef.current?.(
        createEvent("stroke", finished.timecode, {
          pointCount: finished.points.length,
          color: finished.color,
        }),
      );
    }
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setStrokes([]);
  }

  return (
    <>
      {/* Drawing surface — fills the video frame overlay */}
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        style={{ pointerEvents: "auto" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Annotation drawing canvas"
      />

      {/* Floating toolbar over the bottom of the video */}
      <div className="pointer-events-auto absolute bottom-2 left-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/90 px-2 py-1.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select color ${c}`}
              className={`h-5 w-5 rounded-full border-2 ${
                color === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={strokes.length === 0}
          aria-label="Undo last stroke"
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={strokes.length === 0}
          aria-label="Clear all strokes"
        >
          Clear
        </Button>
        <span className="ml-1 text-xs text-muted-foreground">
          {strokes.length} stroke{strokes.length === 1 ? "" : "s"}
        </span>
      </div>
    </>
  );
}
