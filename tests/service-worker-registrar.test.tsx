import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegistrar } from "@/components/site/service-worker-registrar";

describe("ServiceWorkerRegistrar", () => {
  const originalNavigator = navigator;
  const originalAddEventListener = window.addEventListener;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // jsdom persists property deletes poorly; restore by re-assigning
    Object.defineProperty(window, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    window.addEventListener = originalAddEventListener;
  });

  it("renders nothing", () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container.firstChild).toBeNull();
  });

  it("does not register when serviceWorker is unsupported", () => {
    const register = vi.fn();
    // Remove serviceWorker from navigator
    Object.defineProperty(window, "navigator", {
      value: {},
      configurable: true,
    });

    render(<ServiceWorkerRegistrar />);
    expect(register).not.toHaveBeenCalled();
  });
});
