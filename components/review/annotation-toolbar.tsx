"use client";

import type { ReactNode } from "react";
import { Circle, Eraser, Minus, MousePointer2, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Tool = "pen" | "line" | "arrow" | "circle";

export const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff"];

export const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "pen", label: "Freehand", icon: <Pencil className="h-4 w-4" /> },
  { id: "line", label: "Line", icon: <Minus className="h-4 w-4" /> },
  { id: "arrow", label: "Arrow", icon: <MousePointer2 className="h-4 w-4 rotate-45" /> },
  { id: "circle", label: "Circle", icon: <Circle className="h-4 w-4" /> },
];

export type AnnotationToolbarProps = {
  tool: Tool;
  color: string;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onClear: () => void;
  canUndo: boolean;
  marksCount: number;
};

/**
 * Presentational annotation toolbar — tool selection, color swatches,
 * undo, and clear. Contains NO positioning classes; the parent wrapper
 * controls whether this is an overlay (desktop) or a stacked block (mobile).
 */
export function AnnotationToolbar({
  tool,
  color,
  onToolChange,
  onColorChange,
  onUndo,
  onClear,
  canUndo,
  marksCount,
}: AnnotationToolbarProps) {
  return (
    <>
      <div className="flex items-center gap-1">
        {TOOLS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tool === item.id ? "default" : "ghost"}
            size="sm"
            onClick={() => onToolChange(item.id)}
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
            onClick={() => onColorChange(c)}
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
        onClick={onUndo}
        disabled={canUndo}
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
        onClick={onClear}
        disabled={canUndo}
        aria-label="Clear annotations"
        title="Clear"
        className="h-10 gap-1 sm:h-8"
      >
        <Eraser className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
      </Button>
      <span className="ml-1 hidden text-xs text-muted-foreground sm:inline">
        {marksCount} mark{marksCount === 1 ? "" : "s"}
      </span>
    </>
  );
}
