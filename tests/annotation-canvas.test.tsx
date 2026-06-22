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
