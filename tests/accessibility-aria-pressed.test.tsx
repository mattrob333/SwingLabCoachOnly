import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// AnnotationToolbar is a pure presentational component — no browser APIs.
import { AnnotationToolbar } from "@/components/review/annotation-toolbar";

// PaymentForm needs router mock.
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("submission=sub-1"),
}));

// --- AnnotationToolbar aria-pressed --------------------------------------

describe("AnnotationToolbar accessibility", () => {
  const noop = () => {};

  it("tool buttons have aria-pressed reflecting active state", () => {
    const { container } = render(
      <AnnotationToolbar
        tool="pen"
        color="#ef4444"
        onToolChange={noop}
        onColorChange={noop}
        onUndo={noop}
        onClear={noop}
        canUndo={true}
        marksCount={0}
      />,
    );

    const toolButtons = container.querySelectorAll(
      'button[aria-label="Freehand"], button[aria-label="Line"], button[aria-label="Arrow"], button[aria-label="Circle"]',
    );
    expect(toolButtons.length).toBe(4);

    // "pen" is active → aria-pressed=true for Freehand, false for others
    const pen = container.querySelector('button[aria-label="Freehand"]');
    expect(pen?.getAttribute("aria-pressed")).toBe("true");

    const line = container.querySelector('button[aria-label="Line"]');
    expect(line?.getAttribute("aria-pressed")).toBe("false");
  });

  it("color swatch buttons have aria-pressed reflecting active color", () => {
    const { container } = render(
      <AnnotationToolbar
        tool="pen"
        color="#22c55e"
        onToolChange={noop}
        onColorChange={noop}
        onUndo={noop}
        onClear={noop}
        canUndo={true}
        marksCount={0}
      />,
    );

    const activeSwatch = container.querySelector(
      'button[aria-label="Select #22c55e"]',
    );
    expect(activeSwatch?.getAttribute("aria-pressed")).toBe("true");

    const inactiveSwatch = container.querySelector(
      'button[aria-label="Select #ef4444"]',
    );
    expect(inactiveSwatch?.getAttribute("aria-pressed")).toBe("false");
  });
});

// --- PaymentForm toggle aria-pressed -------------------------------------

describe("PaymentForm toggle accessibility", () => {
  it("pay/code toggle buttons have aria-pressed", async () => {
    const { PaymentForm } = await import("@/components/pay/payment-form");
    const { container } = render(
      <PaymentForm submissionId="sub-1" coachName="Marcus Reed" priceUsd={49} />,
    );

    const toggleButtons = container.querySelectorAll(
      'button[aria-pressed]',
    );
    expect(toggleButtons.length).toBeGreaterThanOrEqual(2);

    // One should be pressed (the default "pay" mode)
    const pressed = Array.from(toggleButtons).filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed.length).toBe(1);
  });
});
