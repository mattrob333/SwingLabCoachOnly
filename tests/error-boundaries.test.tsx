import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// app/error.tsx — route-level error boundary
// ---------------------------------------------------------------------------

describe("RouteErrorBoundary (app/error.tsx)", () => {
  it("renders a user-friendly error message", async () => {
    const { default: RouteErrorBoundary } = await import("@/app/error");
    render(
      <RouteErrorBoundary
        error={new Error("Something broke")}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });

  it("renders a Try Again button that calls reset()", async () => {
    const { default: RouteErrorBoundary } = await import("@/app/error");
    const reset = vi.fn();
    render(
      <RouteErrorBoundary error={new Error("boom")} reset={reset} />,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("includes a link back to the coach dashboard", async () => {
    const { default: RouteErrorBoundary } = await import("@/app/error");
    render(
      <RouteErrorBoundary
        error={new Error("boom")}
        reset={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/coach/dashboard");
  });
});

// ---------------------------------------------------------------------------
// app/global-error.tsx — root-level error boundary
// ---------------------------------------------------------------------------

describe("GlobalErrorBoundary (app/global-error.tsx)", () => {
  it("renders a critical error heading distinct from route errors", async () => {
    const { default: GlobalErrorBoundary } = await import("@/app/global-error");
    render(
      <GlobalErrorBoundary
        error={new Error("Fatal")}
        reset={vi.fn()}
      />,
    );
    // global-error must show "Application Error" (distinct from route error's
    // "Something went wrong") to signal a root-level failure.
    expect(screen.getByText(/application error/i)).toBeTruthy();
  });

  it("renders a user-friendly error message", async () => {
    const { default: GlobalErrorBoundary } = await import("@/app/global-error");
    render(
      <GlobalErrorBoundary
        error={new Error("Fatal")}
        reset={vi.fn()}
      />,
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
  });

  it("renders a Try Again button that calls reset()", async () => {
    const { default: GlobalErrorBoundary } = await import("@/app/global-error");
    const reset = vi.fn();
    render(
      <GlobalErrorBoundary error={new Error("Fatal")} reset={reset} />,
    );
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// app/not-found.tsx — custom 404 page
// ---------------------------------------------------------------------------

describe("NotFoundPage (app/not-found.tsx)", () => {
  it("renders a 404 heading", async () => {
    const { default: NotFoundPage } = await import("@/app/not-found");
    render(<NotFoundPage />);
    expect(screen.getByText(/404/i)).toBeTruthy();
  });

  it("renders a link back to the home page", async () => {
    const { default: NotFoundPage } = await import("@/app/not-found");
    render(<NotFoundPage />);
    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders a link to the coach dashboard", async () => {
    const { default: NotFoundPage } = await import("@/app/not-found");
    render(<NotFoundPage />);
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link).toHaveAttribute("href", "/coach/dashboard");
  });
});
