import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AnnotationCanvas } from "@/components/review/annotation-canvas";

// ResizeObserver is not implemented in jsdom — provide a no-op so the
// component's mount effect can run without throwing.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Wrapper({ children }: { children: ReactNode }) {
  return <div style={{ position: "relative", width: 400, height: 300 }}>{children}</div>;
}

describe("AnnotationCanvas — context-unavailable fallback", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalResizeObserver: typeof global.ResizeObserver;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    global.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("renders a fallback message when the 2D canvas context is unavailable", () => {
    // Simulate a browser/environment where getContext("2d") returns null.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { container, queryByRole } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    // The canvas element should NOT be rendered.
    expect(container.querySelector("canvas")).toBeNull();

    // A fallback message should be visible.
    expect(container.textContent).toMatch(/not available|unavailable|isn.?t available/i);

    // The drawing toolbar (tool buttons) should not render either.
    expect(queryByRole("button", { name: /freehand|pen/i })).toBeNull();
  });

  it("renders the canvas and toolbar when the 2D context is available", () => {
    // Provide a stub 2D context so the component initializes normally.
    const stubCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set strokeStyle(_: string) {}
      , set lineWidth(_: number) {}
      , set lineJoin(_: CanvasLineJoin) {}
      , set lineCap(_: CanvasLineCap) {}
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      stubCtx as unknown as CanvasRenderingContext2D,
    );

    const { container } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    // The canvas element SHOULD be rendered.
    expect(container.querySelector("canvas")).not.toBeNull();

    // No fallback message.
    expect(container.textContent).not.toMatch(/not available|unavailable/i);
  });
});

/**
 * Wave 3 — Mobile touch targets for the annotation toolbar.
 *
 * The drawing itself already uses Pointer Events + `touch-none` + pointer
 * capture, so touch drawing works. But the toolbar buttons are too small for
 * touch: tool buttons are h-8 (32px), color swatches are h-6 (24px). These
 * should be bumped to h-10 (40px) on mobile, reverting to h-8 / h-6 on sm+
 * screens — matching the pattern established by the note-card and lightbox
 * touch-target work.
 */
describe("AnnotationCanvas — toolbar touch targets (Wave 3)", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalResizeObserver: typeof global.ResizeObserver;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    const stubCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set strokeStyle(_: string) {},
      set lineWidth(_: number) {},
      set lineJoin(_: CanvasLineJoin) {},
      set lineCap(_: CanvasLineCap) {},
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      stubCtx as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    global.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("tool buttons have h-10 (mobile) + sm:h-8 (desktop) touch targets", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    for (const label of ["Freehand", "Line", "Arrow", "Circle"]) {
      const btn = getByLabelText(label);
      const cls = btn.className;
      expect(cls, `${label} button should have h-10`).toContain("h-10");
      expect(cls, `${label} button should have sm:h-8`).toContain("sm:h-8");
    }
  });

  it("color swatches have h-8 (mobile) + sm:h-6 (desktop) touch targets", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    const swatch = getByLabelText("Select #ef4444");
    const cls = swatch.className;
    expect(cls).toContain("h-8");
    expect(cls).toContain("sm:h-6");
  });

  it("Undo button has h-10 (mobile) + sm:h-8 (desktop)", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    const btn = getByLabelText("Undo last annotation");
    const cls = btn.className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("sm:h-8");
  });

  it("Clear button has h-10 (mobile) + sm:h-8 (desktop)", () => {
    const { getByLabelText } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    const btn = getByLabelText("Clear annotations");
    const cls = btn.className;
    expect(cls).toContain("h-10");
    expect(cls).toContain("sm:h-8");
  });
});

/**
 * Wave 3 — Annotation toolbar mobile layout fix.
 *
 * Problem: on mobile (max-sm), the toolbar was positioned at
 * `top-[calc(100%+0.5rem)]` — BELOW the video frame — which caused it to
 * overlap with the video player's scrubber bar and playback controls.
 *
 * Fix: keep the toolbar overlaid on the video at bottom-left on ALL screen
 * sizes (remove the max-sm repositioning). To minimize how much of the video
 * the toolbar covers on narrow screens, make Undo/Clear buttons icon-only on
 * mobile (text labels hidden via `hidden sm:inline`) and hide the marks-count
 * text on mobile.
 */
describe("AnnotationCanvas — toolbar mobile layout (Wave 3)", () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalResizeObserver: typeof global.ResizeObserver;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    const stubCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      set strokeStyle(_: string) {},
      set lineWidth(_: number) {},
      set lineJoin(_: CanvasLineJoin) {},
      set lineCap(_: CanvasLineCap) {},
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      stubCtx as unknown as CanvasRenderingContext2D,
    );
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    global.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("toolbar does not position below the video frame on mobile (no top-[calc(100%)])", () => {
    const { container } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    // The toolbar is the div containing the tool buttons. Find it by looking
    // for the parent of the first tool button.
    const toolBtn = container.querySelector('button[aria-label="Freehand"]');
    expect(toolBtn).not.toBeNull();
    const toolbar = toolBtn!.parentElement!.parentElement;
    const cls = toolbar!.className;

    // Should NOT have the mobile-below-video positioning.
    expect(cls).not.toContain("top-[calc(100%");
    expect(cls).not.toContain("bottom-auto");
  });

  it("Undo button text label is hidden on mobile (icon-only)", () => {
    const { getByLabelText, container } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    const btn = getByLabelText("Undo last annotation");
    // The "Undo" text should be in a span with `hidden sm:inline`.
    const textSpan = btn.querySelector("span");
    expect(textSpan).not.toBeNull();
    expect(textSpan!.className).toContain("hidden");
    expect(textSpan!.className).toContain("sm:inline");
    expect(textSpan!.textContent).toBe("Undo");
  });

  it("Clear button text label is hidden on mobile (icon-only)", () => {
    const { getByLabelText, container } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    const btn = getByLabelText("Clear annotations");
    const textSpan = btn.querySelector("span");
    expect(textSpan).not.toBeNull();
    expect(textSpan!.className).toContain("hidden");
    expect(textSpan!.className).toContain("sm:inline");
    expect(textSpan!.textContent).toBe("Clear");
  });

  it("marks count text is hidden on mobile", () => {
    const { container } = render(
      <Wrapper>
        <AnnotationCanvas currentTime={0} />
      </Wrapper>,
    );

    // The marks count text is the last child of the toolbar — a span with
    // "0 marks" text. It should have `hidden sm:inline`.
    const toolBtn = container.querySelector('button[aria-label="Freehand"]');
    const toolbar = toolBtn!.parentElement!.parentElement;
    // Find the span that contains "mark" text.
    const allSpans = toolbar!.querySelectorAll("span");
    const marksTextSpan = Array.from(allSpans).find((s) =>
      s.textContent?.includes("mark"),
    );
    expect(marksTextSpan).not.toBeNull();
    expect(marksTextSpan!.className).toContain("hidden");
    expect(marksTextSpan!.className).toContain("sm:inline");
  });
});
