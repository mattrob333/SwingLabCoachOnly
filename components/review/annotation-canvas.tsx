"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Circle, Eraser, Minus, MousePointer2, Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReviewId } from "@/lib/review/ids";
import { createEvent, type ReviewEvent } from "@/lib/review/events";
import type { Point } from "@/lib/review/strokes";

type Tool = "pen" | "line" | "arrow" | "circle";

export type AnnotationMark = {
  id: string;
  tool: Tool;
  timecode: number;
  color: string;
  points: Point[];
  canvasWidth: number;
  canvasHeight: number;
};

type AnnotationCanvasProps = {
  currentTime: number;
  onEvent?: (event: ReviewEvent) => void;
  onMarksChange?: (marks: AnnotationMark[]) => void;
};

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff"];
const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "pen", label: "Freehand", icon: <Pencil className="h-4 w-4" /> },
  { id: "line", label: "Line", icon: <Minus className="h-4 w-4" /> },
  { id: "arrow", label: "Arrow", icon: <MousePointer2 className="h-4 w-4 rotate-45" /> },
  { id: "circle", label: "Circle", icon: <Circle className="h-4 w-4" /> },
];

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 16;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawMark(ctx: CanvasRenderingContext2D, mark: AnnotationMark) {
  if (mark.points.length === 0) return;

  ctx.strokeStyle = mark.color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const first = mark.points[0];
  const last = mark.points[mark.points.length - 1];

  if (mark.tool === "pen") {
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of mark.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    return;
  }

  if (mark.tool === "circle") {
    const x = Math.min(first.x, last.x);
    const y = Math.min(first.y, last.y);
    const width = Math.abs(last.x - first.x);
    const height = Math.abs(last.y - first.y);
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  ctx.lineTo(last.x, last.y);
  ctx.stroke();

  if (mark.tool === "arrow") {
    drawArrowHead(ctx, first, last);
  }
}

export function AnnotationCanvas({
  currentTime,
  onEvent,
  onMarksChange,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [marks, setMarks] = useState<AnnotationMark[]>([]);
  const [activeMark, setActiveMark] = useState<AnnotationMark | null>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState(COLORS[0]);
  const [canvasUnavailable, setCanvasUnavailable] = useState(false);

  const marksRef = useRef(marks);
  const activeMarkRef = useRef(activeMark);
  const currentTimeRef = useRef(currentTime);
  const onEventRef = useRef(onEvent);
  const onMarksChangeRef = useRef(onMarksChange);

  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);
  useEffect(() => {
    activeMarkRef.current = activeMark;
  }, [activeMark]);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onMarksChangeRef.current = onMarksChange;
  }, [onMarksChange]);

  function redrawAll() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const mark of marksRef.current) {
      drawMark(ctx, mark);
    }
    if (activeMarkRef.current) {
      drawMark(ctx, activeMarkRef.current);
    }
  }

  const redrawRef = useRef(redrawAll);
  useEffect(() => {
    redrawRef.current = redrawAll;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect environments where the 2D canvas context is unavailable (e.g.
    // headless browsers without canvas support). When unavailable, show a
    // fallback message instead of a silent blank canvas.
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCanvasUnavailable(true);
      return;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width);
      canvas.height = Math.round(rect.height);
      redrawRef.current();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, activeMark]);

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
    setActiveMark({
      id: createReviewId("mark"),
      tool,
      timecode: currentTimeRef.current,
      color,
      points: [point],
      canvasWidth: canvasRef.current?.width ?? 0,
      canvasHeight: canvasRef.current?.height ?? 0,
    });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeMarkRef.current) return;
    const point = getPoint(e);
    const next =
      activeMarkRef.current.tool === "pen"
        ? { ...activeMarkRef.current, points: [...activeMarkRef.current.points, point] }
        : { ...activeMarkRef.current, points: [activeMarkRef.current.points[0], point] };
    setActiveMark(next);
  }

  function finishMark() {
    const finished = activeMarkRef.current;
    if (!finished) return;

    setActiveMark(null);
    if (finished.points.length < 2) return;

    const canvas = canvasRef.current;
    const finishedWithSize = {
      ...finished,
      canvasWidth: canvas?.width ?? finished.canvasWidth,
      canvasHeight: canvas?.height ?? finished.canvasHeight,
    };

    const nextMarks = [...marksRef.current, finishedWithSize];
    marksRef.current = nextMarks;
    setMarks(nextMarks);
    onMarksChangeRef.current?.(nextMarks);
    onEventRef.current?.(
      createEvent("stroke", finishedWithSize.timecode, {
        tool: finishedWithSize.tool,
        pointCount: finishedWithSize.points.length,
        color: finishedWithSize.color,
      }),
    );
  }

  function undo() {
    setActiveMark(null);
    const nextMarks = marksRef.current.slice(0, -1);
    marksRef.current = nextMarks;
    setMarks(nextMarks);
    onMarksChangeRef.current?.(nextMarks);
  }

  function clearAll() {
    setActiveMark(null);
    marksRef.current = [];
    setMarks([]);
    onMarksChangeRef.current?.([]);
  }

  if (canvasUnavailable) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/40 p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Annotation drawing isn&rsquo;t available in this browser.
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          You can still record voice-over notes and review the swing video.
        </p>
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair touch-none"
        style={{ pointerEvents: "auto" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishMark}
        onPointerCancel={finishMark}
        aria-label="Annotation drawing canvas"
      />

      <div className="pointer-events-auto absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          {TOOLS.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={tool === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTool(item.id)}
              aria-label={item.label}
              title={item.label}
              className="h-10 w-10 px-0 sm:h-8 sm:w-8"
            >
              {item.icon}
            </Button>
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Select ${c}`}
              title={c}
              className={`h-8 w-8 rounded-full border-2 sm:h-6 sm:w-6 ${
                color === c ? "border-foreground" : "border-background"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={marks.length === 0 && !activeMark}
          aria-label="Undo last annotation"
          title="Undo"
          className="h-10 gap-1 sm:h-8"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Undo</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={marks.length === 0 && !activeMark}
          aria-label="Clear annotations"
          title="Clear"
          className="h-10 gap-1 sm:h-8"
        >
          <Eraser className="h-4 w-4" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
          {marks.length} mark{marks.length === 1 ? "" : "s"}
        </span>
      </div>
    </>
  );
}
