"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { createReviewId } from "@/lib/review/ids";
import { createEvent, type ReviewEvent } from "@/lib/review/events";
import type { Point } from "@/lib/review/strokes";
import { AnnotationToolbar, type Tool, COLORS } from "@/components/review/annotation-toolbar";

export type AnnotationMark = {
  id: string;
  tool: Tool;
  timecode: number;
  color: string;
  points: Point[];
  canvasWidth: number;
  canvasHeight: number;
};

export type AnnotationCanvasHandle = {
  undo: () => void;
  clearAll: () => void;
};

type AnnotationCanvasProps = {
  currentTime: number;
  /** Controlled tool. If omitted, the canvas manages its own. */
  tool?: Tool;
  color?: string;
  onToolChange?: (tool: Tool) => void;
  onColorChange?: (color: string) => void;
  onEvent?: (event: ReviewEvent) => void;
  onMarksChange?: (marks: AnnotationMark[]) => void;
};

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

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({
    currentTime,
    tool: controlledTool,
    color: controlledColor,
    onToolChange,
    onColorChange,
    onEvent,
    onMarksChange,
  }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [marks, setMarks] = useState<AnnotationMark[]>([]);
    const [activeMark, setActiveMark] = useState<AnnotationMark | null>(null);

    // Controlled/uncontrolled pattern for tool + color.
    const [internalTool, setInternalTool] = useState<Tool>("arrow");
    const [internalColor, setInternalColor] = useState(COLORS[0]);
    const tool = controlledTool ?? internalTool;
    const color = controlledColor ?? internalColor;

    function changeTool(next: Tool) {
      if (onToolChange) onToolChange(next);
      else setInternalTool(next);
    }
    function changeColor(next: string) {
      if (onColorChange) onColorChange(next);
      else setInternalColor(next);
    }

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

    useImperativeHandle(ref, () => ({
      undo,
      clearAll,
    }), []);

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

    const canUndo = marks.length === 0 && !activeMark;

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

        {/* Desktop toolbar: overlaid on the video frame (sm+ only).
            On mobile the toolbar is rendered below the video by the parent
            (ReviewStudioClient) to avoid covering the swing. */}
        <div className="pointer-events-auto absolute bottom-2 left-2 hidden max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur sm:flex">
          <AnnotationToolbar
            tool={tool}
            color={color}
            onToolChange={changeTool}
            onColorChange={changeColor}
            onUndo={undo}
            onClear={clearAll}
            canUndo={canUndo}
            marksCount={marks.length}
          />
        </div>
      </>
    );
  },
);
