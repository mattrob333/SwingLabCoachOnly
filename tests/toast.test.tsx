import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import {
  showToast,
  dismissToast,
  clearToasts,
  getSnapshot,
  subscribe,
  useToast,
} from "@/lib/toast";
import { Toaster } from "@/components/ui/toaster";

// ---------------------------------------------------------------------------
// Store unit tests
// ---------------------------------------------------------------------------

describe("toast store", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("showToast adds a toast to the store", () => {
    showToast({ title: "Saved" });
    expect(getSnapshot()).toHaveLength(1);
    expect(getSnapshot()[0].title).toBe("Saved");
  });

  it("showToast returns the toast id", () => {
    const id = showToast({ title: "Done" });
    expect(id).toBeTruthy();
    expect(getSnapshot()[0].id).toBe(id);
  });

  it("showToast uses default variant when not specified", () => {
    showToast({ title: "Hello" });
    expect(getSnapshot()[0].variant).toBe("default");
  });

  it("showToast uses provided variant", () => {
    showToast({ title: "Error!", variant: "error" });
    expect(getSnapshot()[0].variant).toBe("error");
  });

  it("showToast defaults duration to 5000ms", () => {
    showToast({ title: "Test" });
    expect(getSnapshot()[0].duration).toBe(5000);
  });

  it("showToast respects custom duration", () => {
    showToast({ title: "Test", duration: 3000 });
    expect(getSnapshot()[0].duration).toBe(3000);
  });

  it("dismissToast removes a toast by id", () => {
    const id = showToast({ title: "A" });
    showToast({ title: "B" });
    expect(getSnapshot()).toHaveLength(2);
    dismissToast(id);
    expect(getSnapshot()).toHaveLength(1);
    expect(getSnapshot()[0].title).toBe("B");
  });

  it("dismissToast is a no-op for unknown id", () => {
    showToast({ title: "A" });
    dismissToast("nonexistent");
    expect(getSnapshot()).toHaveLength(1);
  });

  it("clearToasts removes all toasts", () => {
    showToast({ title: "A" });
    showToast({ title: "B" });
    showToast({ title: "C" });
    expect(getSnapshot()).toHaveLength(3);
    clearToasts();
    expect(getSnapshot()).toHaveLength(0);
  });

  it("clearToasts is a no-op when already empty", () => {
    clearToasts();
    expect(getSnapshot()).toHaveLength(0);
  });

  it("showToast stores description when provided", () => {
    showToast({ title: "Saved", description: "Your changes are stored." });
    expect(getSnapshot()[0].description).toBe("Your changes are stored.");
  });

  it("showToast description is undefined when omitted", () => {
    showToast({ title: "Saved" });
    expect(getSnapshot()[0].description).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss (fake timers)
// ---------------------------------------------------------------------------

describe("toast auto-dismiss", () => {
  beforeEach(() => {
    clearToasts();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-dismisses after duration", () => {
    showToast({ title: "Auto", duration: 2000 });
    expect(getSnapshot()).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(getSnapshot()).toHaveLength(0);
  });

  it("does not auto-dismiss when duration is 0", () => {
    showToast({ title: "Persistent", duration: 0 });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(getSnapshot()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// subscribe
// ---------------------------------------------------------------------------

describe("subscribe", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("calls listener when a toast is added", () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    showToast({ title: "A" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("calls listener when a toast is dismissed", () => {
    const listener = vi.fn();
    const id = showToast({ title: "A" });
    const unsub = subscribe(listener);
    listener.mockClear();
    dismissToast(id);
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("unsubscribe stops calling listener", () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    unsub();
    showToast({ title: "A" });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useToast hook
// ---------------------------------------------------------------------------

describe("useToast", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("returns toast and dismiss functions", () => {
    const { toast, dismiss } = useToast();
    expect(typeof toast).toBe("function");
    expect(typeof dismiss).toBe("function");
    const id = toast({ title: "Via hook" });
    expect(getSnapshot()).toHaveLength(1);
    dismiss(id);
    expect(getSnapshot()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Toaster component
// ---------------------------------------------------------------------------

describe("Toaster", () => {
  beforeEach(() => {
    clearToasts();
  });

  it("renders nothing when there are no toasts", () => {
    const { container } = render(<Toaster />);
    expect(container.firstChild).toBeNull();
  });

  it("renders active toasts with title", () => {
    showToast({ title: "Lesson saved" });
    render(<Toaster />);
    expect(screen.getByText("Lesson saved")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    showToast({ title: "Saved", description: "All changes stored." });
    render(<Toaster />);
    expect(screen.getByText("All changes stored.")).toBeInTheDocument();
  });

  it("dismiss button removes the toast", () => {
    showToast({ title: "Dismissable" });
    render(<Toaster />);
    expect(screen.getByText("Dismissable")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Dismissable")).toBeNull();
  });

  it("applies error variant styles", () => {
    const id = showToast({ title: "Failed", variant: "error" });
    render(<Toaster />);
    const toast = screen.getByTestId(`toast-${id}`);
    expect(toast.className).toContain("border-destructive");
    expect(toast.getAttribute("role")).toBe("alert");
  });

  it("applies success variant styles", () => {
    const id = showToast({ title: "Done!", variant: "success" });
    render(<Toaster />);
    const toast = screen.getByTestId(`toast-${id}`);
    expect(toast.className).toContain("border-success");
    expect(toast.getAttribute("role")).toBe("status");
  });

  it("renders multiple toasts", () => {
    showToast({ title: "First" });
    showToast({ title: "Second" });
    render(<Toaster />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
